import { createHash, createHmac, timingSafeEqual } from 'crypto'

export const REPLY_WINDOW = 24 * 60 * 60 * 1000

// Shared format with the offline lab deletion tool. No raw provider identifiers.
export function deletionCutoffKey(tenantId: string, accountId: string, participantId: string): string {
  const scope = tenantId + '\0' + accountId
  const hash = (value: string) => createHash('sha256').update(value).digest('hex')
  return `instagram:deleted-before:${hash(scope)}:${hash(scope + '\0' + participantId)}`
}

export function signatureMatches(raw: Buffer, signature: string | undefined, secret: string): boolean {
  if (!secret || typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false
  const expected = createHmac('sha256', secret).update(raw).digest()
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))
}

export function canReply(lastInboundAt: Date | null, now: number): boolean {
  if (!lastInboundAt) return false
  const age = now - lastInboundAt.getTime()
  return age >= 0 && age < REPLY_WINDOW
}

export interface IncomingDirect {
  accountId: string; participantId: string; messageId: string; text: string; at: Date
  standby?: true
}

export function incomingDirects(payload: unknown, now: number): IncomingDirect[] {
  const body = payload as any
  if (body?.object !== 'instagram' || !Array.isArray(body.entry)) return []
  const result: IncomingDirect[] = []
  for (const entry of body.entry.slice(0, 100)) {
    if (!entry || typeof entry !== 'object') continue
    // Unified Login also delivers messages inside entry.changes[].value.
    // Apply the same account, recipient and message checks to both envelopes.
    const messaging = Array.isArray(entry.messaging) ? entry.messaging.slice(0, 100).map((event: any) => ({ event, standby: false })) : []
    const standby = Array.isArray(entry.standby) ? entry.standby.slice(0, 100).map((event: any) => ({ event, standby: true })) : []
    const changes = Array.isArray(entry.changes) ? entry.changes.slice(0, 100)
      .filter((change: any) => ['messages', 'standby'].includes(change?.field))
      .map((change: any) => ({ event: change.value, standby: change.field === 'standby' })) : []
    for (const { event, standby: passive } of [...messaging, ...standby, ...changes].slice(0, 100)) {
      if (!event || typeof event !== 'object' || event.message?.is_echo || event.message?.is_deleted || event.message?.is_unsupported) continue
      const accountId = String(entry.id ?? ''), participantId = String(event.sender?.id ?? '')
      const recipientId = String(event.recipient?.id ?? '')
      const messageId = event.message?.mid, text = event.message?.text
      // Meta's signed sample uses decimal seconds as a string; Messenger's
      // envelope uses milliseconds. Reject other coercions and invalid dates.
      const rawTimestamp = typeof event.timestamp === 'string' && /^\d{10,13}$/.test(event.timestamp)
        ? Number(event.timestamp) : event.timestamp
      const timestamp = typeof rawTimestamp === 'number' && rawTimestamp >= 1_000_000_000 && rawTimestamp < 10_000_000_000
        ? rawTimestamp * 1000 : rawTimestamp
      if (!/^\d+$/.test(accountId) || !/^\d+$/.test(participantId) || accountId === participantId || recipientId !== accountId) continue
      if (typeof messageId !== 'string' || !messageId || messageId.length > 512 || typeof text !== 'string' || !text.trim()) continue
      if (typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp) || timestamp <= 0 || timestamp > now + 300_000) continue
      result.push({ accountId, participantId, messageId, text: text.slice(0, 10000), at: new Date(Math.min(timestamp, now)), ...(passive ? { standby: true as const } : {}) })
    }
  }
  return result
}
