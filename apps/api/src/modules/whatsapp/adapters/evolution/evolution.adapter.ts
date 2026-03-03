import { Injectable } from '@nestjs/common'
import {
  IWhatsAppProvider,
  CreateInstanceDto,
  InstanceResult,
  QRCodeResult,
  InstanceStatus,
  MessageResult,
  ImagePayload,
  VideoPayload,
  AudioPayload,
  DocumentPayload,
  Group,
  GroupMember,
  MentionPayload,
  WebhookEvent,
} from '../../ports/whatsapp-provider.interface'
import { EvolutionHttpClient } from './evolution-http.client'

@Injectable()
export class EvolutionAdapter implements IWhatsAppProvider {
  constructor(private readonly http: EvolutionHttpClient) {}

  async createInstance(config: CreateInstanceDto): Promise<InstanceResult> {
    const instanceName = `${config.tenantSlug}-${config.instanceName}`
    const response = await this.http.post<{ instance: { instanceName: string; status: string } }>(
      '/instance/create',
      { instanceName, integration: 'WHATSAPP-BAILEYS' },
    )
    return {
      instanceId: response.instance.instanceName,
      status: response.instance.status,
    }
  }

  async connectInstance(instanceId: string): Promise<QRCodeResult> {
    const response = await this.http.get<{ base64: string; code?: string }>(
      `/instance/connect/${instanceId}`,
    )
    return { qrCode: response.base64, pairingCode: response.code }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    await this.http.delete(`/instance/logout/${instanceId}`)
  }

  async deleteInstance(instanceId: string): Promise<void> {
    await this.http.delete(`/instance/delete/${instanceId}`)
  }

  async getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
    const response = await this.http.get<{ instance: { state: string } }>(
      `/instance/connectionState/${instanceId}`,
    )
    const stateMap: Record<string, InstanceStatus> = {
      open: 'connected',
      close: 'disconnected',
      connecting: 'connecting',
    }
    return stateMap[response.instance.state] ?? 'disconnected'
  }

  async sendText(instanceId: string, to: string, text: string): Promise<MessageResult> {
    const response = await this.http.post<{ key: { id: string } }>(
      `/message/sendText/${instanceId}`,
      { number: to, text },
    )
    return { messageId: response.key.id, status: 'sent' }
  }

  async sendImage(instanceId: string, to: string, payload: ImagePayload): Promise<MessageResult> {
    const response = await this.http.post<{ key: { id: string } }>(
      `/message/sendMedia/${instanceId}`,
      { number: to, mediatype: 'image', media: payload.imageUrl, caption: payload.caption },
    )
    return { messageId: response.key.id, status: 'sent' }
  }

  async sendVideo(instanceId: string, to: string, payload: VideoPayload): Promise<MessageResult> {
    const response = await this.http.post<{ key: { id: string } }>(
      `/message/sendMedia/${instanceId}`,
      { number: to, mediatype: 'video', media: payload.videoUrl, caption: payload.caption },
    )
    return { messageId: response.key.id, status: 'sent' }
  }

  async sendAudio(instanceId: string, to: string, payload: AudioPayload): Promise<MessageResult> {
    const response = await this.http.post<{ key: { id: string } }>(
      `/message/sendMedia/${instanceId}`,
      { number: to, mediatype: 'audio', media: payload.audioUrl },
    )
    return { messageId: response.key.id, status: 'sent' }
  }

  async sendDocument(
    instanceId: string,
    to: string,
    payload: DocumentPayload,
  ): Promise<MessageResult> {
    const response = await this.http.post<{ key: { id: string } }>(
      `/message/sendMedia/${instanceId}`,
      {
        number: to,
        mediatype: 'document',
        media: payload.documentUrl,
        fileName: payload.fileName,
        caption: payload.caption,
      },
    )
    return { messageId: response.key.id, status: 'sent' }
  }

  async getGroups(instanceId: string): Promise<Group[]> {
    const response = await this.http.get<Array<{ id: string; subject: string; desc?: string; size: number }>>(
      `/group/fetchAllGroups/${instanceId}?getParticipants=false`,
    )
    return response.map((g) => ({
      id: g.id,
      name: g.subject,
      description: g.desc,
      participantCount: g.size,
    }))
  }

  async getGroupMembers(instanceId: string, groupId: string): Promise<GroupMember[]> {
    const response = await this.http.get<{ participants: Array<{ id: string; pushName?: string; admin?: string }>}>(
      `/group/participants/${instanceId}?groupJid=${groupId}`,
    )
    return response.participants.map((p) => ({
      id: p.id,
      pushName: p.pushName,
      isAdmin: !!p.admin,
    }))
  }

  async sendGroupMention(
    instanceId: string,
    groupId: string,
    payload: MentionPayload,
  ): Promise<MessageResult> {
    const response = await this.http.post<{ key: { id: string } }>(
      `/message/sendText/${instanceId}`,
      { number: groupId, text: payload.text, mentions: payload.mentions },
    )
    return { messageId: response.key.id, status: 'sent' }
  }

  async setWebhook(instanceId: string, url: string, events: WebhookEvent[]): Promise<void> {
    await this.http.post(`/webhook/set/${instanceId}`, {
      url,
      webhook_by_events: true,
      webhook_base64: false,
      events,
    })
  }
}
