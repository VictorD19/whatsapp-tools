// Port (contrato) -- NUNCA muda
// Trocar de provider = criar novo adapter, zero impacto aqui

import type {
  CreateInstanceDto,
  InstanceResult,
  QRCodeResult,
  InstanceStatus,
  InstanceInfo,
} from '../dto/instance.dto'
import type {
  MessageResult,
  SendTextOptions,
  ImagePayload,
  VideoPayload,
  AudioPayload,
  DocumentPayload,
  Group,
  GroupMember,
  MentionPayload,
} from '../dto/send-message.dto'
import type { WebhookEvent } from '../dto/webhook.dto'
import type { ChatItem, HistoryMessage, FindMessagesOptions } from '../dto/chat.dto'

export interface IWhatsAppProvider {
  // Instancias
  createInstance(config: CreateInstanceDto): Promise<InstanceResult>
  connectInstance(instanceId: string): Promise<QRCodeResult>
  disconnectInstance(instanceId: string): Promise<void>
  deleteInstance(instanceId: string): Promise<void>
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>
  getInstanceInfo(instanceId: string): Promise<InstanceInfo>

  // Mensagens
  sendText(instanceId: string, to: string, text: string, options?: SendTextOptions): Promise<MessageResult>
  sendImage(instanceId: string, to: string, payload: ImagePayload): Promise<MessageResult>
  sendVideo(instanceId: string, to: string, payload: VideoPayload): Promise<MessageResult>
  sendAudio(instanceId: string, to: string, payload: AudioPayload): Promise<MessageResult>
  sendDocument(instanceId: string, to: string, payload: DocumentPayload): Promise<MessageResult>

  // Grupos
  getGroups(instanceId: string): Promise<Group[]>
  getGroupMembers(instanceId: string, groupId: string): Promise<GroupMember[]>
  sendGroupMention(instanceId: string, groupId: string, payload: MentionPayload): Promise<MessageResult>

  // Chat history
  findChats(instanceId: string): Promise<ChatItem[]>
  findMessages(instanceId: string, options: FindMessagesOptions): Promise<HistoryMessage[]>

  // Contatos
  getProfilePictureUrl(instanceId: string, phone: string): Promise<string | null>

  // Webhook
  setWebhook(instanceId: string, url: string, events: WebhookEvent[]): Promise<void>
}
