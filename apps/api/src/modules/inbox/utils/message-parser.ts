export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'UNKNOWN'

export interface ParsedMessage {
  body: string | null
  type: MessageType
  mediaUrl?: string
}

export function parseWhatsAppMessage(
  message: Record<string, unknown> | undefined,
): ParsedMessage {
  if (!message) {
    return { body: null, type: 'UNKNOWN' }
  }

  if (message.conversation) {
    return { body: message.conversation as string, type: 'TEXT' }
  }

  if (message.extendedTextMessage) {
    const ext = message.extendedTextMessage as Record<string, unknown>
    return { body: ext.text as string, type: 'TEXT' }
  }

  if (message.imageMessage) {
    const img = message.imageMessage as Record<string, unknown>
    return {
      body: (img.caption as string) ?? null,
      type: 'IMAGE',
      mediaUrl: img.url as string,
    }
  }

  if (message.videoMessage) {
    const vid = message.videoMessage as Record<string, unknown>
    return {
      body: (vid.caption as string) ?? null,
      type: 'VIDEO',
      mediaUrl: vid.url as string,
    }
  }

  if (message.audioMessage) {
    const aud = message.audioMessage as Record<string, unknown>
    return {
      body: null,
      type: 'AUDIO',
      mediaUrl: aud.url as string,
    }
  }

  if (message.documentMessage) {
    const doc = message.documentMessage as Record<string, unknown>
    return {
      body: (doc.fileName as string) ?? null,
      type: 'DOCUMENT',
      mediaUrl: doc.url as string,
    }
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

  const messageTypes = [
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'documentMessage',
    'stickerMessage',
  ]

  for (const type of messageTypes) {
    const inner = message[type] as Record<string, unknown> | undefined
    if (!inner) continue

    const contextInfo = inner.contextInfo as Record<string, unknown> | undefined
    if (contextInfo?.stanzaId) {
      return contextInfo.stanzaId as string
    }
  }

  return undefined
}
