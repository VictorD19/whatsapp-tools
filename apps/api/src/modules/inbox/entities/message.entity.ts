export interface MessageEntity {
  id: string
  tenantId: string
  conversationId: string
  fromMe: boolean
  fromBot: boolean
  body: string | null
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN'
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  evolutionId: string | null
  mediaUrl: string | null
  sentAt: Date
  createdAt: Date
}
