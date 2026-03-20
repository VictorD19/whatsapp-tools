export interface MessageResult {
  messageId: string
  status: 'sent' | 'error'
}

export interface SendTextOptions {
  quotedMessageEvolutionId?: string
}

export interface ImagePayload {
  url: string
  caption?: string
  mimetype?: string
}

export interface VideoPayload {
  url: string
  caption?: string
  mimetype?: string
}

export interface AudioPayload {
  url?: string
  base64?: string
  mimetype?: string
}

export interface DocumentPayload {
  url: string
  fileName: string
  mimetype: string
}

export interface MentionPayload {
  text: string
  mentions: string[]
}

export interface Group {
  id: string
  name: string
  size: number
}

export interface GroupMember {
  id: string
  phone?: string
  name?: string
  admin: boolean
}
