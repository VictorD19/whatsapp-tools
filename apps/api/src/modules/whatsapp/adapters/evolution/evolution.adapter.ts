import { Injectable, Logger } from '@nestjs/common'
import type { IWhatsAppProvider } from '../../ports/whatsapp-provider.interface'
import type {
  CreateInstanceDto,
  InstanceResult,
  QRCodeResult,
  InstanceStatus,
  InstanceInfo,
} from '../../dto/instance.dto'
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
} from '../../dto/send-message.dto'
import type { WebhookEvent } from '../../dto/webhook.dto'
import type { ChatItem, HistoryMessage, FindMessagesOptions } from '../../dto/chat.dto'
import { EvolutionHttpClient } from './evolution-http.client'

// ---------- Evolution API response shapes (internal only) ----------

interface EvoCreateInstanceResponse {
  instance: { instanceName: string; status: string }
}

interface EvoConnectResponse {
  base64?: string
  code?: string
}

interface EvoConnectionStateResponse {
  instance: { state: string }
}

interface EvoFetchInstanceResponse {
  name: string
  connectionStatus: string
  ownerJid: string | null
}

interface EvoMessageResponse {
  key: { id: string }
}

interface EvoGroupRaw {
  id: string
  subject: string
  size: number
}

interface EvoParticipant {
  id: string
  pushName?: string
  admin?: string | null
}

interface EvoParticipantsResponse {
  participants: EvoParticipant[]
}

// -------------------------------------------------------------------

const STATE_MAP: Record<string, InstanceStatus> = {
  open: 'CONNECTED',
  close: 'DISCONNECTED',
  connecting: 'CONNECTING',
}

@Injectable()
export class EvolutionAdapter implements IWhatsAppProvider {
  private readonly logger = new Logger(EvolutionAdapter.name)

  constructor(private readonly http: EvolutionHttpClient) {}

  // ── Instancias ────────────────────────────────────────────────────

  async createInstance(config: CreateInstanceDto): Promise<InstanceResult> {
    const instanceName = `${config.tenantId}_${config.name}`

    const body: Record<string, unknown> = {
      instanceName,
      qrcode: false,
      integration: 'WHATSAPP-BAILEYS',
    }

    if (config.webhookUrl) {
      body.webhook = {
        enabled: true,
        url: config.webhookUrl,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'SEND_MESSAGE',
        ],
      }
    }

    const res = await this.http.post<EvoCreateInstanceResponse>(
      '/instance/create',
      body,
    )

    const status = STATE_MAP[res.instance.status] ?? 'DISCONNECTED'

    return {
      instanceId: res.instance.instanceName,
      status,
    }
  }

  async connectInstance(instanceId: string): Promise<QRCodeResult> {
    const res = await this.http.get<EvoConnectResponse>(
      `/instance/connect/${instanceId}`,
    )

    return {
      qrCode: res.base64 ?? '',
      pairingCode: res.code,
    }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    await this.http.delete(`/instance/logout/${instanceId}`)
  }

  async deleteInstance(instanceId: string): Promise<void> {
    await this.http.delete(`/instance/delete/${instanceId}`)
  }

  async getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
    const res = await this.http.get<EvoConnectionStateResponse>(
      `/instance/connectionState/${instanceId}`,
    )

    return STATE_MAP[res.instance.state] ?? 'DISCONNECTED'
  }

  async getInstanceInfo(instanceId: string): Promise<InstanceInfo> {
    const res = await this.http.get<EvoFetchInstanceResponse>(
      `/instance/fetchInstances?instanceName=${instanceId}`,
    )

    const data = Array.isArray(res) ? res[0] : res
    const status = STATE_MAP[data?.connectionStatus] ?? 'DISCONNECTED'
    let phone: string | undefined

    if (data?.ownerJid) {
      phone = data.ownerJid.split('@')[0]
    }

    return { instanceId, status, phone }
  }

  // ── Mensagens ─────────────────────────────────────────────────────

  async sendText(
    instanceId: string,
    to: string,
    text: string,
    options?: SendTextOptions,
  ): Promise<MessageResult> {
    const body: Record<string, unknown> = { number: to, text }

    if (options?.quotedMessageEvolutionId) {
      body.quoted = { key: { id: options.quotedMessageEvolutionId } }
    }

    const res = await this.http.post<EvoMessageResponse>(
      `/message/sendText/${instanceId}`,
      body,
    )

    return { messageId: res.key.id, status: 'sent' }
  }

  async sendImage(
    instanceId: string,
    to: string,
    payload: ImagePayload,
  ): Promise<MessageResult> {
    const res = await this.http.post<EvoMessageResponse>(
      `/message/sendMedia/${instanceId}`,
      {
        number: to,
        mediatype: 'image',
        media: payload.url,
        caption: payload.caption,
      },
    )

    return { messageId: res.key.id, status: 'sent' }
  }

  async sendVideo(
    instanceId: string,
    to: string,
    payload: VideoPayload,
  ): Promise<MessageResult> {
    const res = await this.http.post<EvoMessageResponse>(
      `/message/sendMedia/${instanceId}`,
      {
        number: to,
        mediatype: 'video',
        media: payload.url,
        caption: payload.caption,
      },
    )

    return { messageId: res.key.id, status: 'sent' }
  }

  async sendAudio(
    instanceId: string,
    to: string,
    payload: AudioPayload,
  ): Promise<MessageResult> {
    const res = await this.http.post<EvoMessageResponse>(
      `/message/sendWhatsAppAudio/${instanceId}`,
      { number: to, audio: payload.url },
    )

    return { messageId: res.key.id, status: 'sent' }
  }

  async sendDocument(
    instanceId: string,
    to: string,
    payload: DocumentPayload,
  ): Promise<MessageResult> {
    const res = await this.http.post<EvoMessageResponse>(
      `/message/sendMedia/${instanceId}`,
      {
        number: to,
        mediatype: 'document',
        media: payload.url,
        fileName: payload.fileName,
        mimetype: payload.mimetype,
      },
    )

    return { messageId: res.key.id, status: 'sent' }
  }

  // ── Grupos ────────────────────────────────────────────────────────

  async getGroups(instanceId: string): Promise<Group[]> {
    const res = await this.http.get<EvoGroupRaw[]>(
      `/group/fetchAllGroups/${instanceId}?getParticipants=false`,
    )

    return res.map((g) => ({
      id: g.id,
      name: g.subject,
      size: g.size,
    }))
  }

  async getGroupMembers(
    instanceId: string,
    groupId: string,
  ): Promise<GroupMember[]> {
    const res = await this.http.get<EvoParticipantsResponse>(
      `/group/participants/${instanceId}?groupJid=${groupId}`,
    )

    return res.participants.map((p) => ({
      id: p.id,
      name: p.pushName,
      admin: !!p.admin,
    }))
  }

  async sendGroupMention(
    instanceId: string,
    groupId: string,
    payload: MentionPayload,
  ): Promise<MessageResult> {
    const res = await this.http.post<EvoMessageResponse>(
      `/message/sendText/${instanceId}`,
      {
        number: groupId,
        text: payload.text,
        mentioned: payload.mentions,
      },
    )

    return { messageId: res.key.id, status: 'sent' }
  }

  // ── Chat history ─────────────────────────────────────────────────

  async findChats(instanceId: string): Promise<ChatItem[]> {
    const res = await this.http.post<Array<{ id: string; name?: string }>>(
      `/chat/findChats/${instanceId}`,
    )

    return res.map((chat) => ({
      remoteJid: chat.id,
      name: chat.name,
      isGroup: chat.id.includes('@g.us'),
    }))
  }

  async findMessages(
    instanceId: string,
    options: FindMessagesOptions,
  ): Promise<HistoryMessage[]> {
    const res = await this.http.post<Array<Record<string, unknown>>>(
      `/chat/findMessages/${instanceId}`,
      {
        where: { key: { remoteJid: options.remoteJid } },
        limit: options.limit ?? 50,
      },
    )

    return res.map((msg) => {
      const key = msg.key as Record<string, unknown>
      return {
        key: {
          id: key.id as string,
          remoteJid: key.remoteJid as string,
          fromMe: key.fromMe as boolean,
        },
        messageTimestamp: msg.messageTimestamp as number,
        pushName: msg.pushName as string | undefined,
        message: msg.message as Record<string, unknown> | undefined,
      }
    })
  }

  // ── Contatos ─────────────────────────────────────────────────────

  async getProfilePictureUrl(
    instanceId: string,
    phone: string,
  ): Promise<string | null> {
    try {
      const res = await this.http.get<{ profilePictureUrl?: string | null }>(
        `/chat/fetchProfilePictureUrl/${instanceId}?number=${phone}`,
      )
      return res.profilePictureUrl ?? null
    } catch {
      this.logger.warn(
        `Failed to fetch profile picture for ${phone} on ${instanceId}`,
        'EvolutionAdapter',
      )
      return null
    }
  }

  // ── Webhook ───────────────────────────────────────────────────────

  async setWebhook(
    instanceId: string,
    url: string,
    events: WebhookEvent[],
  ): Promise<void> {
    await this.http.post(`/webhook/set/${instanceId}`, {
      url,
      webhook: {
        enabled: true,
        url,
        events,
      },
    })
  }
}
