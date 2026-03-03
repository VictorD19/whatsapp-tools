// Port (contrato) — NUNCA muda
// Trocar de provider = criar novo adapter, zero impacto aqui

export interface CreateInstanceDto {
  instanceName: string
  tenantSlug: string
}

export interface InstanceResult {
  instanceId: string
  status: string
}

export interface QRCodeResult {
  qrCode: string
  pairingCode?: string
}

export type InstanceStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_code'

export interface MessageResult {
  messageId: string
  status: 'sent' | 'queued' | 'failed'
}

export interface ImagePayload {
  imageUrl: string
  caption?: string
}

export interface VideoPayload {
  videoUrl: string
  caption?: string
}

export interface AudioPayload {
  audioUrl: string
}

export interface DocumentPayload {
  documentUrl: string
  fileName: string
  caption?: string
}

export interface Group {
  id: string
  name: string
  description?: string
  participantCount: number
}

export interface GroupMember {
  id: string
  pushName?: string
  isAdmin: boolean
}

export interface MentionPayload {
  text: string
  mentions: string[]
}

export type WebhookEvent =
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_SENT'
  | 'STATUS_UPDATE'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'QR_CODE'

export interface IWhatsAppProvider {
  // Instâncias
  createInstance(config: CreateInstanceDto): Promise<InstanceResult>
  connectInstance(instanceId: string): Promise<QRCodeResult>
  disconnectInstance(instanceId: string): Promise<void>
  deleteInstance(instanceId: string): Promise<void>
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>

  // Mensagens
  sendText(instanceId: string, to: string, text: string): Promise<MessageResult>
  sendImage(instanceId: string, to: string, payload: ImagePayload): Promise<MessageResult>
  sendVideo(instanceId: string, to: string, payload: VideoPayload): Promise<MessageResult>
  sendAudio(instanceId: string, to: string, payload: AudioPayload): Promise<MessageResult>
  sendDocument(instanceId: string, to: string, payload: DocumentPayload): Promise<MessageResult>

  // Grupos
  getGroups(instanceId: string): Promise<Group[]>
  getGroupMembers(instanceId: string, groupId: string): Promise<GroupMember[]>
  sendGroupMention(instanceId: string, groupId: string, payload: MentionPayload): Promise<MessageResult>

  // Webhook
  setWebhook(instanceId: string, url: string, events: WebhookEvent[]): Promise<void>
}
