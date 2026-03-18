import { Process, Processor } from '@nestjs/bull'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { InboxRepository } from '../inbox.repository'
import { InboxGateway } from '../inbox.gateway'
import { ContactsService } from '@modules/contacts/contacts.service'
import { InstancesService } from '@modules/instances/instances.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { TenantsService } from '@modules/tenants/tenants.service'
import { StorageService, STORABLE_MEDIA_TYPES } from '@modules/storage/storage.service'
import { parseWhatsAppMessage, extractQuotedStanzaId } from '../utils/message-parser'

const DEFAULT_AI_WAIT_MS = 5000

/**
 * Extrai o número de telefone de um JID do WhatsApp.
 * - "5511999999999@s.whatsapp.net" → "5511999999999"
 * - "554999475887-1453161997@g.us"  → "554999475887"  (grupo antigo)
 * - "xxxxx@lid"                      → null (JID salvo bruto, sem extração)
 */
function extractPhoneFromJid(jid: string): string | null {
  if (!jid || jid.includes('@lid')) return null
  const withoutSuffix = jid.split('@')[0]       // remove @s.whatsapp.net / @g.us
  const phone = withoutSuffix.split('-')[0]      // remove sufixo de grupo antigo
  return /^\d+$/.test(phone) ? phone : null
}

interface InboxWebhookJob {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Processor(QUEUES.WEBHOOK_INBOUND)
export class InboxWebhookProcessor {
  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly contactsService: ContactsService,
    private readonly instancesService: InstancesService,
    private readonly whatsapp: WhatsAppService,
    private readonly tenantsService: TenantsService,
    private readonly storage: StorageService,
    private readonly gateway: InboxGateway,
    private readonly logger: LoggerService,
    @InjectQueue(QUEUES.AI_RESPONSE)
    private readonly aiResponseQueue: Queue,
  ) {}

  @Process('inbox-webhook')
  async handleInboxWebhook(job: Job<InboxWebhookJob>) {
    const { instanceName, event, data } = job.data

    this.logger.debug(
      `Processing inbox webhook: ${event} for ${instanceName}`,
      'InboxWebhookProcessor',
    )

    const instance = await this.instancesService.findByEvolutionId(instanceName)
    if (!instance) {
      this.logger.warn(
        `Instance not found for evolutionId: ${instanceName}`,
        'InboxWebhookProcessor',
      )
      return
    }

    switch (event) {
      case 'messages.upsert': {
        await this.handleMessageReceived(
          { id: instance.id, tenantId: instance.tenantId, evolutionId: instance.evolutionId, defaultAssistantId: instance.defaultAssistantId ?? null },
          data,
        )
        break
      }
      case 'messages.update': {
        await this.handleMessageStatusUpdate(instance, data)
        break
      }
      default: {
        this.logger.debug(
          `Unhandled inbox webhook event: ${event}`,
          'InboxWebhookProcessor',
        )
      }
    }
  }

  private async handleMessageReceived(
    instance: { id: string; tenantId: string; evolutionId: string; defaultAssistantId: string | null },
    data: Record<string, unknown>,
  ) {
    // Evolution sends messages array
    const messages = Array.isArray(data) ? data : (data.messages as Array<Record<string, unknown>> ?? [data])

    for (const msg of messages) {
      const key = msg.key as Record<string, unknown> | undefined
      if (!key) continue

      const fromMe = key.fromMe as boolean

      // Skip old messages from history sync (only process messages from last 60s)
      const messageTimestamp = msg.messageTimestamp as number | undefined
      if (messageTimestamp) {
        const msgAge = Math.floor(Date.now() / 1000) - messageTimestamp
        if (msgAge > 60) continue
      }

      let remoteJid = key.remoteJid as string | undefined
      if (!remoteJid) continue

      // Handle LID format — use remoteJidAlt or sender for real phone number
      if (remoteJid.includes('@lid')) {
        const remoteJidAlt = key.remoteJidAlt as string | undefined
        const sender = msg.sender as string | undefined

        if (remoteJidAlt) {
          remoteJid = remoteJidAlt
        } else if (sender) {
          remoteJid = sender
        } else {
          this.logger.warn(
            `Cannot resolve LID ${remoteJid} — no alternative JID available`,
            'InboxWebhookProcessor',
          )
          continue
        }
      }

      const isGroup = remoteJid.includes('@g.us')
      // For groups use full JID as identifier; for 1:1 use phone number
      const phone = isGroup ? remoteJid : remoteJid.split('@')[0]
      const pushName = msg.pushName as string | undefined

      // Extract message body and quoted context
      const message = msg.message as Record<string, unknown> | undefined

      // Reações: tratar separadamente — nunca criar nova mensagem
      const reactionMessage = message?.reactionMessage as Record<string, unknown> | undefined
      if (reactionMessage) {
        const senderJid = (key.participant as string | undefined) ?? (fromMe ? 'me' : phone)
        await this.handleReaction(instance, reactionMessage, senderJid)
        continue
      }
      const parsed = parseWhatsAppMessage(message)
      const { body, type, mediaUrl } = parsed

      // Resolve quoted message (reply context)
      let quotedMessageId: string | undefined
      const quotedStanzaId = extractQuotedStanzaId(message)
      if (quotedStanzaId) {
        const quotedMsg = await this.inboxRepository.findMessageByEvolutionId(quotedStanzaId)
        if (quotedMsg) {
          quotedMessageId = quotedMsg.id
        }
      }

      // Find or create contact (for groups, use group JID; for 1:1, use phone)
      // Only update name from pushName on inbound messages (fromMe pushName is our own name)
      const contactName = (!fromMe && !isGroup) ? pushName : undefined
      const contact = await this.contactsService.findOrCreate(
        instance.tenantId,
        phone,
        contactName,
      )

      // Fetch profile picture if contact doesn't have one (skip for groups and fromMe)
      if (!isGroup && !fromMe && !contact.avatarUrl) {
        const avatarUrl = await this.whatsapp.getProfilePictureUrl(
          instance.evolutionId,
          phone,
        )
        if (avatarUrl) {
          await this.contactsService.updateAvatarUrl(contact.id, avatarUrl)
          contact.avatarUrl = avatarUrl
        }
      }

      // Find active conversation or create new one
      let conversation = await this.inboxRepository.findActiveConversation(
        instance.tenantId,
        instance.id,
        contact.id,
      )

      const now = new Date()
      let isNewConversation = false

      if (!conversation) {
        // Check if a closed conversation exists — reopen it instead of creating a new one
        const closedConversation = await this.inboxRepository.findConversationByContactAndInstance(
          instance.tenantId,
          instance.id,
          contact.id,
        )

        if (closedConversation) {
          conversation = await this.inboxRepository.reopenConversation(instance.tenantId, closedConversation.id)
          isNewConversation = true
          if (!fromMe) {
            await this.inboxRepository.incrementUnreadCount(closedConversation.id)
          }
        } else {
          const protocol = await this.tenantsService.getNextProtocol(instance.tenantId)
          conversation = await this.inboxRepository.createConversation({
            tenantId: instance.tenantId,
            instanceId: instance.id,
            contactId: contact.id,
            protocol,
            lastMessageAt: now,
          })
          isNewConversation = true
        }
      } else if (!fromMe) {
        await this.inboxRepository.incrementUnreadCount(conversation.id)
      }

      // Deduplicate: skip if message already exists (e.g. fromMe sent via API — Evolution echoes it back)
      const evolutionMsgId = key.id as string | undefined
      if (evolutionMsgId) {
        const existing = await this.inboxRepository.findMessageByEvolutionId(evolutionMsgId)
        if (existing) {
          this.logger.debug(
            `Skipping duplicate message evolutionId=${evolutionMsgId}`,
            'InboxWebhookProcessor',
          )
          continue
        }
      }

      // Extract sender info for group messages
      // senderJid: phone number when resolvable, raw JID (incl. @lid) otherwise — never null for groups
      const rawParticipant = isGroup && !fromMe
        ? (key.participant as string | undefined)
        : undefined
      const senderJid = rawParticipant
        ? (extractPhoneFromJid(rawParticipant) ?? rawParticipant)
        : undefined
      const senderName = isGroup && !fromMe
        ? pushName ?? undefined
        : undefined

      // Create message
      const newMessage = await this.inboxRepository.createMessage({
        tenantId: instance.tenantId,
        conversationId: conversation.id,
        fromMe,
        body,
        type,
        status: fromMe ? 'SENT' : 'DELIVERED',
        evolutionId: evolutionMsgId,
        mediaUrl,
        quotedMessageId,
        senderJid,
        senderName,
      })

      // Download e armazena mídia inbound no storage local (fire and forget)
      // STICKER e tipos não suportados continuam via proxy Evolution
      if (evolutionMsgId && STORABLE_MEDIA_TYPES.has(type)) {
        this.downloadAndStoreInboundMedia(
          instance,
          newMessage.id,
          evolutionMsgId,
          instance.tenantId,
        ).catch((err) =>
          this.logger.warn(
            `Failed to store inbound media for message ${newMessage.id}: ${(err as Error).message}`,
            'InboxWebhookProcessor',
          ),
        )
      }

      // Emit WebSocket events
      if (isNewConversation) {
        const fullConversation = await this.inboxRepository.findConversationById(
          instance.tenantId,
          conversation.id,
        )
        if (fullConversation) {
          this.gateway.emitConversationCreated(instance.tenantId, {
            conversation: fullConversation,
          })
        }
      }

      this.gateway.emitNewMessage(instance.tenantId, {
        conversationId: conversation.id,
        message: {
          id: newMessage.id,
          conversationId: conversation.id,
          fromMe,
          fromBot: false,
          body: newMessage.body,
          type: newMessage.type,
          status: newMessage.status,
          mediaUrl: newMessage.mediaUrl,
          quotedMessageId: newMessage.quotedMessageId,
          quotedMessage: newMessage.quotedMessage,
          senderJid: newMessage.senderJid,
          senderName: newMessage.senderName,
          sentAt: newMessage.sentAt,
          createdAt: newMessage.createdAt,
        },
      })

      this.logger.log(
        `New message in conversation ${conversation.id} from ${phone}`,
        'InboxWebhookProcessor',
      )

      // Enfileira resposta da IA se conversa (ou instância) tem assistente ativo e mensagem é inbound
      const effectiveAssistantId = conversation!.assistantId ?? instance.defaultAssistantId
      if (!fromMe && effectiveAssistantId && !conversation!.assistantPausedAt) {
        const convId = conversation!.id
        const jobId = `ai-response:${convId}`
        const existingJob = await this.aiResponseQueue.getJob(jobId)
        if (existingJob) {
          const state = await existingJob.getState()
          if (state === 'delayed' || state === 'waiting') {
            await existingJob.remove()
          }
        }

        await this.aiResponseQueue.add(
          'process-ai-response',
          {
            conversationId: convId,
            tenantId: instance.tenantId,
            instanceEvolutionId: instance.evolutionId,
          },
          {
            jobId,
            delay: DEFAULT_AI_WAIT_MS,
            attempts: 2,
            backoff: { type: 'fixed', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        )

        this.logger.debug(
          `AI response enqueued for conversation ${convId} (delay: ${DEFAULT_AI_WAIT_MS}ms)`,
          'InboxWebhookProcessor',
        )
      }
    }
  }

  private async handleReaction(
    instance: { id: string; tenantId: string },
    reactionMessage: Record<string, unknown>,
    senderJid: string,
  ) {
    const targetKey = reactionMessage.key as Record<string, unknown> | undefined
    const targetEvolutionId = targetKey?.id as string | undefined
    const emoji = reactionMessage.text as string | undefined

    if (!targetEvolutionId) return

    const targetMessage = await this.inboxRepository.findMessageByEvolutionId(targetEvolutionId)
    if (!targetMessage) {
      this.logger.debug(
        `Reaction target message not found: evolutionId=${targetEvolutionId}`,
        'InboxWebhookProcessor',
      )
      return
    }

    if (!emoji) {
      await this.inboxRepository.deleteReaction(targetMessage.id, senderJid)
    } else {
      await this.inboxRepository.upsertReaction({
        tenantId: instance.tenantId,
        messageId: targetMessage.id,
        senderJid,
        emoji,
      })
    }

    const reactions = await this.inboxRepository.findReactionsByMessageId(targetMessage.id)

    this.gateway.emitMessageReactionUpdated(instance.tenantId, {
      messageId: targetMessage.id,
      conversationId: targetMessage.conversationId,
      reactions,
    })

    this.logger.debug(
      `Reaction ${emoji ?? '(removed)'} on message ${targetMessage.id} by ${senderJid}`,
      'InboxWebhookProcessor',
    )
  }

  private async downloadAndStoreInboundMedia(
    instance: { evolutionId: string },
    messageId: string,
    evolutionMsgId: string,
    tenantId: string,
  ) {
    const media = await this.whatsapp.getMediaBase64(instance.evolutionId, evolutionMsgId)
    if (!media?.base64 || !media.mimetype) return

    const buffer = Buffer.from(media.base64, 'base64')
    const key = await this.storage.uploadMedia(tenantId, buffer, media.mimetype)
    await this.inboxRepository.updateMessageMediaUrl(messageId, key)

    this.logger.debug(
      `Inbound media stored: ${key}`,
      'InboxWebhookProcessor',
    )
  }

  private async handleMessageStatusUpdate(
    instance: { id: string; tenantId: string },
    data: Record<string, unknown>,
  ) {
    const updates = Array.isArray(data) ? data : [data]

    for (const update of updates) {
      const key = update.key as Record<string, unknown> | undefined
      const evolutionId = key?.id as string | undefined
      if (!evolutionId) continue

      const statusNum = update.status as number | undefined
      const statusMap: Record<number, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
        1: 'SENT',
        2: 'DELIVERED',
        3: 'READ',
        4: 'FAILED',
        5: 'READ',
      }

      const status = statusNum ? statusMap[statusNum] : undefined
      if (!status) continue

      const updated = await this.inboxRepository.updateMessageStatusByEvolutionId(
        evolutionId,
        status,
      )

      if (updated) {
        this.gateway.emitMessageStatusUpdated(instance.tenantId, {
          messageId: updated.id,
          conversationId: updated.conversationId,
          status,
        })
      }
    }
  }
}
