import { Inject, Injectable } from '@nestjs/common'
import type { IWhatsAppProvider } from './ports/whatsapp-provider.interface'
import type { CreateInstanceDto } from './dto/instance.dto'
import type {
  SendTextOptions,
  ImagePayload,
  VideoPayload,
  AudioPayload,
  DocumentPayload,
  MentionPayload,
} from './dto/send-message.dto'
import type { WebhookEvent } from './dto/webhook.dto'
import type { FindMessagesOptions } from './dto/chat.dto'
import { WHATSAPP_PROVIDER } from './whatsapp.tokens'

@Injectable()
export class WhatsAppService {
  constructor(
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: IWhatsAppProvider,
  ) {}

  createInstance(config: CreateInstanceDto) {
    return this.provider.createInstance(config)
  }

  connectInstance(instanceId: string) {
    return this.provider.connectInstance(instanceId)
  }

  disconnectInstance(instanceId: string) {
    return this.provider.disconnectInstance(instanceId)
  }

  deleteInstance(instanceId: string) {
    return this.provider.deleteInstance(instanceId)
  }

  getInstanceStatus(instanceId: string) {
    return this.provider.getInstanceStatus(instanceId)
  }

  getInstanceInfo(instanceId: string) {
    return this.provider.getInstanceInfo(instanceId)
  }

  sendText(instanceId: string, to: string, text: string, options?: SendTextOptions) {
    return this.provider.sendText(instanceId, to, text, options)
  }

  sendImage(instanceId: string, to: string, payload: ImagePayload) {
    return this.provider.sendImage(instanceId, to, payload)
  }

  sendVideo(instanceId: string, to: string, payload: VideoPayload) {
    return this.provider.sendVideo(instanceId, to, payload)
  }

  sendAudio(instanceId: string, to: string, payload: AudioPayload) {
    return this.provider.sendAudio(instanceId, to, payload)
  }

  sendDocument(instanceId: string, to: string, payload: DocumentPayload) {
    return this.provider.sendDocument(instanceId, to, payload)
  }

  getGroups(instanceId: string) {
    return this.provider.getGroups(instanceId)
  }

  getGroupMembers(instanceId: string, groupId: string) {
    return this.provider.getGroupMembers(instanceId, groupId)
  }

  sendGroupMention(instanceId: string, groupId: string, payload: MentionPayload) {
    return this.provider.sendGroupMention(instanceId, groupId, payload)
  }

  findChats(instanceId: string) {
    return this.provider.findChats(instanceId)
  }

  findMessages(instanceId: string, options: FindMessagesOptions) {
    return this.provider.findMessages(instanceId, options)
  }

  getProfilePictureUrl(instanceId: string, phone: string) {
    return this.provider.getProfilePictureUrl(instanceId, phone)
  }

  setWebhook(instanceId: string, url: string, events: WebhookEvent[]) {
    return this.provider.setWebhook(instanceId, url, events)
  }
}
