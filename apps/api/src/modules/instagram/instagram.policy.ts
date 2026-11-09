import { createHmac, timingSafeEqual } from 'crypto'

export const REPLY_WINDOW = 24 * 60 * 60 * 1000

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
}

export function incomingDirects(payload: unknown, now: number): IncomingDirect[] {
  const body = payload as any
  if (body?.object !== 'instagram' || !Array.isArray(body.entry)) return []
  const result: IncomingDirect[] = []
  for (const entry of body.entry.slice(0, 100)) {
    for (const event of (Array.isArray(entry.messaging) ? entry.messaging : []).slice(0, 100)) {
      if (event.message?.is_echo || event.message?.is_deleted || event.message?.is_unsupported) continue
      const accountId = String(entry.id ?? ''), participantId = String(event.sender?.id ?? '')
      const recipientId = String(event.recipient?.id ?? '')
      const messageId = event.message?.mid, text = event.message?.text, timestamp = event.timestamp
      if (!/^\d+$/.test(accountId) || !/^\d+$/.test(participantId) || accountId === participantId || recipientId !== accountId) continue
      if (typeof messageId !== 'string' || !messageId || messageId.length > 512 || typeof text !== 'string' || !text.trim()) continue
      if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now + 300_000) continue
      result.push({ accountId, participantId, messageId, text: text.slice(0, 10000), at: new Date(Math.min(timestamp, now)) })
    }
  }
  return result
}
