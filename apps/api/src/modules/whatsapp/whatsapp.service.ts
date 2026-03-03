import { Inject, Injectable } from '@nestjs/common'
import {
  IWhatsAppProvider,
  CreateInstanceDto,
  ImagePayload,
  VideoPayload,
  AudioPayload,
  DocumentPayload,
  MentionPayload,
  WebhookEvent,
} from './ports/whatsapp-provider.interface'
import { WHATSAPP_PROVIDER } from './whatsapp.module'

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

  sendText(instanceId: string, to: string, text: string) {
    return this.provider.sendText(instanceId, to, text)
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

  setWebhook(instanceId: string, url: string, events: WebhookEvent[]) {
    return this.provider.setWebhook(instanceId, url, events)
  }
}
