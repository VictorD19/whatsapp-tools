export interface ChatItem {
  remoteJid: string
  name?: string
  isGroup: boolean
}

export interface HistoryMessage {
  key: {
    id: string
    remoteJid: string
    fromMe: boolean
  }
  messageTimestamp: number
  pushName?: string
  message?: Record<string, unknown>
}

export interface FindMessagesOptions {
  remoteJid: string
  limit?: number
}
