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
import type { ChatItem, HistoryMessage, FindMessagesOptions, ContactInfo } from '../../dto/chat.dto'
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
  phoneNumber?: string
  pushName?: string
  name?: string | null
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
        mimetype: payload.mimetype,
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
        mimetype: payload.mimetype,
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
      `/message/sendMedia/${instanceId}`,
      {
        number: to,
        mediatype: 'audio',
        mimetype: payload.mimetype,
        media: payload.url,
      },
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
      phone: p.phoneNumber?.split('@')[0],
      name: p.pushName || p.name || undefined,
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
    const res = await this.http.post<Array<{
      id: string | null
      remoteJid?: string
      name?: string
      pushName?: string
      profilePicUrl?: string
      lastMessage?: {
        key?: { remoteJidAlt?: string; fromMe?: boolean }
        pushName?: string
      }
    }>>(
      `/chat/findChats/${instanceId}`,
    )

    const chats = Array.isArray(res) ? res : []

    return chats
      .filter((chat) => chat.remoteJid != null)
      .map((chat) => {
        let jid = chat.remoteJid!

        // Resolve LID to real phone using lastMessage.key.remoteJidAlt
        if (jid.includes('@lid')) {
          const alt = chat.lastMessage?.key?.remoteJidAlt
          if (alt) {
            this.logger.debug(
              `LID resolved: ${jid} → ${alt}`,
              'EvolutionAdapter',
            )
            jid = alt
          } else {
            this.logger.warn(
              `LID unresolved (no remoteJidAlt): ${jid} — pushName: ${chat.lastMessage?.pushName ?? chat.pushName ?? 'unknown'}`,
              'EvolutionAdapter',
            )
          }
        }

        // Use lastMessage.pushName as fallback — but only if NOT fromMe (fromMe shows "Você")
        const lastMsgName = chat.lastMessage?.key?.fromMe
          ? undefined
          : chat.lastMessage?.pushName
        const rawName = chat.pushName ?? lastMsgName ?? chat.name
        // Filter out phone-number-like strings (Evolution API bug #2426 returns phone as pushName)
        const name = rawName && !/^\d+$/.test(rawName) ? rawName : undefined

        return {
          remoteJid: jid,
          name,
          isGroup: jid.includes('@g.us'),
          profilePicUrl: chat.profilePicUrl ?? undefined,
        }
      })
  }

  async findMessages(
    instanceId: string,
    options: FindMessagesOptions,
  ): Promise<HistoryMessage[]> {
    const res = await this.http.post<{
      messages?: {
        total?: number
        records?: Array<Record<string, unknown>>
      }
    }>(
      `/chat/findMessages/${instanceId}`,
      {
        where: { key: { remoteJid: options.remoteJid } },
        limit: options.limit ?? 50,
      },
    )

    const records = res?.messages?.records ?? (Array.isArray(res) ? res : [])

    // Deduplicate by key.id — Evolution API returns each message twice
    const seen = new Set<string>()
    const unique = records.filter((msg) => {
      const key = msg.key as Record<string, unknown>
      const id = key?.id as string | undefined
      if (!id) return true
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    return unique.map((msg) => {
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

  async findContacts(instanceId: string): Promise<ContactInfo[]> {
    try {
      const res = await this.http.post<Array<{
        id?: string
        remoteJid?: string
        pushName?: string
        profilePicUrl?: string
      }>>(
        `/chat/findContacts/${instanceId}`,
      )

      const contacts = Array.isArray(res) ? res : []

      return contacts
        .filter((c) => c.remoteJid != null)
        .map((c) => ({
          remoteJid: c.remoteJid!,
          pushName: c.pushName || undefined,
          profilePicUrl: c.profilePicUrl || undefined,
        }))
    } catch (error) {
      this.logger.warn(
        `Failed to fetch contacts for ${instanceId}: ${(error as Error).message}`,
        'EvolutionAdapter',
      )
      return []
    }
  }

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

  // ── Media ────────────────────────────────────────────────────────

  async getMediaBase64(
    instanceId: string,
    messageEvolutionId: string,
  ): Promise<{ base64: string; mimetype: string } | null> {
    try {
      const res = await this.http.post<{
        base64?: string
        mimetype?: string
      }>(
        `/chat/getBase64FromMediaMessage/${instanceId}`,
        { message: { key: { id: messageEvolutionId } } },
      )

      if (!res.base64 || !res.mimetype) return null
      return { base64: res.base64, mimetype: res.mimetype }
    } catch {
      this.logger.warn(
        `Failed to get media base64 for message ${messageEvolutionId} on ${instanceId}`,
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
