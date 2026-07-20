export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'UNKNOWN'

export interface ParsedMessage {
  body: string | null
  type: MessageType
  mediaUrl?: string
}

/**
 * Unwraps WhatsApp message wrappers (ephemeral, viewOnce, etc.)
 * to get the actual inner message content.
 */
function unwrapMessage(
  message: Record<string, unknown>,
): Record<string, unknown> {
  // WhatsApp wraps messages in various containers — unwrap them
  const wrapperKeys = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'editedMessage',
  ]

  for (const key of wrapperKeys) {
    const wrapper = message[key] as Record<string, unknown> | undefined
    if (wrapper?.message) {
      // Recursively unwrap (e.g. ephemeral > viewOnce > message)
      return unwrapMessage(wrapper.message as Record<string, unknown>)
    }
  }

  return message
}

export function parseWhatsAppMessage(
  message: Record<string, unknown> | undefined,
): ParsedMessage {
  if (!message) {
    return { body: null, type: 'UNKNOWN' }
  }

  // Unwrap container messages (ephemeral, viewOnce, etc.)
  const msg = unwrapMessage(message)

  if (msg.conversation) {
    return { body: msg.conversation as string, type: 'TEXT' }
  }

  if (msg.extendedTextMessage) {
    const ext = msg.extendedTextMessage as Record<string, unknown>
    return { body: ext.text as string, type: 'TEXT' }
  }

  if (msg.imageMessage) {
    const img = msg.imageMessage as Record<string, unknown>
    return {
      body: (img.caption as string) ?? null,
      type: 'IMAGE',
      mediaUrl: (img.url as string) ?? (img.directPath as string) ?? undefined,
    }
  }

  if (msg.videoMessage) {
    const vid = msg.videoMessage as Record<string, unknown>
    return {
      body: (vid.caption as string) ?? null,
      type: 'VIDEO',
      mediaUrl: (vid.url as string) ?? (vid.directPath as string) ?? undefined,
    }
  }

  if (msg.audioMessage) {
    const aud = msg.audioMessage as Record<string, unknown>
    return {
      body: null,
      type: 'AUDIO',
      mediaUrl: (aud.url as string) ?? (aud.directPath as string) ?? undefined,
    }
  }

  if (msg.ptvMessage) {
    // PTT video (circle video notes)
    const ptv = msg.ptvMessage as Record<string, unknown>
    return {
      body: null,
      type: 'VIDEO',
      mediaUrl: (ptv.url as string) ?? (ptv.directPath as string) ?? undefined,
    }
  }

  if (msg.documentMessage) {
    const doc = msg.documentMessage as Record<string, unknown>
    return {
      body: (doc.fileName as string) ?? null,
      type: 'DOCUMENT',
      mediaUrl: (doc.url as string) ?? (doc.directPath as string) ?? undefined,
    }
  }

  if (msg.stickerMessage) {
    const stk = msg.stickerMessage as Record<string, unknown>
    return {
      body: null,
      type: 'STICKER',
      mediaUrl: (stk.url as string) ?? (stk.directPath as string) ?? undefined,
    }
  }

  if (msg.locationMessage) {
    const loc = msg.locationMessage as Record<string, unknown>
    return {
      body: `${loc.degreesLatitude},${loc.degreesLongitude}`,
      type: 'TEXT',
    }
  }

  if (msg.liveLocationMessage) {
    const loc = msg.liveLocationMessage as Record<string, unknown>
    return {
      body: `${loc.degreesLatitude},${loc.degreesLongitude}`,
      type: 'TEXT',
    }
  }

  if (msg.contactMessage) {
    const ct = msg.contactMessage as Record<string, unknown>
    return {
      body: (ct.displayName as string) ?? null,
      type: 'TEXT',
    }
  }

  if (msg.contactsArrayMessage) {
    const arr = msg.contactsArrayMessage as Record<string, unknown>
    const contacts = arr.contacts as Array<Record<string, unknown>> | undefined
    const names = contacts?.map((c) => c.displayName as string).filter(Boolean)
    return {
      body: names?.join(', ') ?? null,
      type: 'TEXT',
    }
  }

  // Protocol messages (key distribution, receipts, etc.) — skip
  if (msg.protocolMessage || msg.senderKeyDistributionMessage) {
    return { body: null, type: 'UNKNOWN' }
  }

  return { body: null, type: 'UNKNOWN' }
}

/**
 * Extracts the stanzaId (quoted message evolution ID) from contextInfo
 * present in extendedTextMessage, imageMessage, videoMessage, etc.
 */
export function extractQuotedStanzaId(
  message: Record<string, unknown> | undefined,
): string | undefined {
  if (!message) return undefined

  // Unwrap container messages first
  const msg = unwrapMessage(message)

  const messageTypes = [
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage',
    'ptvMessage',
  ]

  for (const type of messageTypes) {
    const inner = msg[type] as Record<string, unknown> | undefined
    if (!inner) continue

    const contextInfo = inner.contextInfo as Record<string, unknown> | undefined
    if (contextInfo?.stanzaId) {
      return contextInfo.stanzaId as string
    }
  }

  return undefined
}

const AD_REPLY_MESSAGE_TYPES = [
  'extendedTextMessage',
  'imageMessage',
  'videoMessage',
  'audioMessage',
  'documentMessage',
  'stickerMessage',
  'ptvMessage',
  'conversation',
]

/**
 * Localiza o bloco contextInfo.externalAdReplyInfo dentro da mensagem — presente
 * na primeira mensagem de conversas originadas de anúncios Click-to-WhatsApp.
 * Busca em todos os tipos de mensagem e também na raiz (payloads da Evolution API
 * às vezes expõem contextInfo diretamente na raiz).
 */
function getExternalAdReplyInfo(
  msg: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const type of AD_REPLY_MESSAGE_TYPES) {
    const inner = msg[type] as Record<string, unknown> | undefined
    if (!inner || typeof inner !== 'object') continue

    const contextInfo = inner.contextInfo as Record<string, unknown> | undefined
    const externalAdReplyInfo = contextInfo?.externalAdReplyInfo as Record<string, unknown> | undefined
    if (externalAdReplyInfo) return externalAdReplyInfo
  }

  const rootContextInfo = msg.contextInfo as Record<string, unknown> | undefined
  return rootContextInfo?.externalAdReplyInfo as Record<string, unknown> | undefined
}

/**
 * Extrai o ctwa_clid (Click-to-WhatsApp Click ID) de contextInfo.externalAdReplyInfo.
 * Necessário para atribuir eventos do Meta CAPI a um anúncio específico no Ads Manager.
 */
export function extractCtwaClid(
  message: Record<string, unknown> | undefined,
): string | undefined {
  if (!message) return undefined
  const externalAdReplyInfo = getExternalAdReplyInfo(unwrapMessage(message))
  return externalAdReplyInfo?.ctwaClid as string | undefined
}

export interface AdAttribution {
  ctwaClid: string
  sourceId?: string
  title?: string
  sourceUrl?: string
}

/**
 * Extrai os dados do anúncio (ctwa_clid, ID, título e URL do criativo) que originou
 * a conversa. Usado para identificar de qual campanha/anúncio cada conversa veio,
 * sem depender da Marketing API do Meta — os dados já vêm no próprio webhook.
 */
export function extractAdAttribution(
  message: Record<string, unknown> | undefined,
): AdAttribution | undefined {
  if (!message) return undefined
  const externalAdReplyInfo = getExternalAdReplyInfo(unwrapMessage(message))
  if (!externalAdReplyInfo?.ctwaClid) return undefined

  return {
    ctwaClid: externalAdReplyInfo.ctwaClid as string,
    sourceId: externalAdReplyInfo.sourceId as string | undefined,
    title: externalAdReplyInfo.title as string | undefined,
    sourceUrl: externalAdReplyInfo.sourceUrl as string | undefined,
  }
}
