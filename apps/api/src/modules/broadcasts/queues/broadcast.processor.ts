import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { StorageService, isStorageKey } from '@modules/storage/storage.service'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { InboxGateway } from '@modules/inbox/inbox.gateway'
import { TenantsService } from '@modules/tenants/tenants.service'
import { BroadcastsRepository } from '../broadcasts.repository'
import { BroadcastGateway } from '../broadcasts.gateway'
import type { BroadcastJobData } from './broadcast.producer'
import type { BroadcastMessageType } from '@prisma/client'

const BATCH_CHECK_INTERVAL = 10
const PROGRESS_EMIT_INTERVAL = 5

interface Variation {
  messageType: BroadcastMessageType
  text: string
  mediaUrl: string | null
  fileName: string | null
}

@Injectable()
export class BroadcastProcessor implements OnModuleInit {
  /** Cache do base64 da mídia — baixa do storage uma vez por broadcast. */
  private mediaBase64Cache = new Map<string, { base64: string; mimetype: string }>()

  constructor(
    @InjectQueue(QUEUES.BROADCAST)
    private readonly queue: Queue,
    private readonly repository: BroadcastsRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly storage: StorageService,
    private readonly gateway: BroadcastGateway,
    private readonly inboxRepository: InboxRepository,
    private readonly inboxGateway: InboxGateway,
    private readonly tenantsService: TenantsService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.queue.isReady()
    this.queue.process('send-broadcast', 2, (job: Job<BroadcastJobData>) => {
      return this.handleSendBroadcast(job)
    })
    this.logger.log('Broadcast worker registered', 'BroadcastProcessor')
  }

  async handleSendBroadcast(job: Job<BroadcastJobData>) {
    const { broadcastId, tenantId } = job.data

    this.logger.log(
      `[DISPATCH] Job picked up — broadcastId=${broadcastId} tenantId=${tenantId}`,
      'BroadcastProcessor',
    )

    const broadcast = await this.repository.findByIdWithInstances(broadcastId)
    if (!broadcast) {
      this.logger.error(
        `[DISPATCH] Broadcast ${broadcastId} not found in DB — aborting`,
        undefined,
        'BroadcastProcessor',
      )
      return
    }

    this.logger.log(
      `[DISPATCH] Broadcast loaded — name="${broadcast.name}" status=${broadcast.status} total=${broadcast.totalCount} sent=${broadcast.sentCount} failed=${broadcast.failedCount} scheduledAt=${broadcast.scheduledAt ?? 'immediate'}`,
      'BroadcastProcessor',
    )

    // Guard: skip if broadcast was cancelled or already completed
    if (['CANCELLED', 'COMPLETED', 'FAILED'].includes(broadcast.status)) {
      this.logger.log(
        `[DISPATCH] Broadcast ${broadcastId} skipped — status is ${broadcast.status}`,
        'BroadcastProcessor',
      )
      return
    }

    // Get connected instances with evolutionId for sending
    const allInstances = broadcast.instances.map((bi) => bi.instance)
    const connectedInstances = allInstances.filter((i) => i.status === 'CONNECTED')

    this.logger.log(
      `[DISPATCH] Instances: ${allInstances.length} total, ${connectedInstances.length} connected — [${allInstances.map((i) => `${i.name}(${i.status})`).join(', ')}]`,
      'BroadcastProcessor',
    )

    if (connectedInstances.length === 0) {
      this.logger.error(
        `[DISPATCH] Broadcast ${broadcastId} FAILED — no connected instances`,
        undefined,
        'BroadcastProcessor',
      )
      await this.repository.updateStatus(broadcastId, 'FAILED')
      this.gateway.emitBroadcastFailed(tenantId, {
        broadcastId,
        reason: 'Nenhuma instância conectada',
      })
      return
    }

    // Build variations list — prefer new variations table, fallback to legacy fields
    const variations: Variation[] = broadcast.variations && broadcast.variations.length > 0
      ? broadcast.variations.map((v) => ({
          messageType: v.messageType,
          text: v.text,
          mediaUrl: v.mediaUrl,
          fileName: v.fileName,
        }))
      : broadcast.messageTexts.map((text) => ({
          messageType: broadcast.messageType,
          text,
          mediaUrl: broadcast.mediaUrl,
          fileName: broadcast.fileName,
        }))

    this.logger.log(
      `[DISPATCH] Variations: ${variations.length} — types=[${variations.map((v) => v.messageType).join(', ')}]`,
      'BroadcastProcessor',
    )

    if (variations.length === 0) {
      this.logger.error(
        `[DISPATCH] Broadcast ${broadcastId} FAILED — no variations configured`,
        undefined,
        'BroadcastProcessor',
      )
      await this.repository.updateStatus(broadcastId, 'FAILED')
      this.gateway.emitBroadcastFailed(tenantId, {
        broadcastId,
        reason: 'Nenhuma variação de mensagem configurada',
      })
      return
    }

    // Mark as RUNNING
    await this.repository.updateStatus(broadcastId, 'RUNNING', { startedAt: new Date() })
    this.gateway.emitBroadcastStarted(tenantId, {
      broadcastId,
      name: broadcast.name,
      total: broadcast.totalCount,
    })
    this.logger.log(
      `[DISPATCH] Broadcast ${broadcastId} marked RUNNING — starting send loop`,
      'BroadcastProcessor',
    )

    let sentCount = broadcast.sentCount
    let failedCount = broadcast.failedCount
    let instanceIndex = 0
    let processedInBatch = 0

    try {
      // Process in batches of 50
      let batchNumber = 0
      while (true) {
        const recipients = await this.repository.findPendingRecipients(broadcastId, 50)
        if (recipients.length === 0) break
        batchNumber++

        this.logger.log(
          `[DISPATCH] Batch #${batchNumber} — ${recipients.length} pending recipients fetched`,
          'BroadcastProcessor',
        )

        for (const recipient of recipients) {
          // Check if broadcast was paused or cancelled
          if (processedInBatch > 0 && processedInBatch % BATCH_CHECK_INTERVAL === 0) {
            const currentStatus = await this.repository.getStatus(broadcastId)
            if (currentStatus !== 'RUNNING') {
              this.logger.log(
                `[DISPATCH] Broadcast ${broadcastId} interrupted — status changed to ${currentStatus} after ${processedInBatch} messages`,
                'BroadcastProcessor',
              )
              return
            }
          }

          // Round-robin between connected instances
          const instance = connectedInstances[instanceIndex % connectedInstances.length]
          instanceIndex++

          // Pick random variation — one per contact
          const variation = this.pickRandom(variations)
          const text = this.interpolateVariables(
            variation.text,
            recipient.name ?? recipient.contact.name,
            recipient.phone,
          )

          try {
            this.logger.log(
              `[SEND] #${processedInBatch + 1} → phone=${recipient.phone} instance=${instance.name}(${instance.evolutionId}) type=${variation.messageType} hasMedia=${!!variation.mediaUrl}`,
              'BroadcastProcessor',
            )

            await this.sendMessage(
              instance.evolutionId,
              recipient.phone,
              variation.messageType,
              text,
              variation.mediaUrl,
              text,
              variation.fileName,
            )

            await this.repository.updateRecipientStatus(recipient.id, 'SENT', {
              sentAt: new Date(),
            })
            await this.repository.incrementCounters(broadcastId, 'sentCount')
            sentCount++

            this.logger.log(
              `[SEND OK] phone=${recipient.phone} — total sent=${sentCount}/${broadcast.totalCount}`,
              'BroadcastProcessor',
            )

            // Register message in inbox and assign conversation to broadcast creator
            await this.registerInInbox({
              tenantId,
              instanceId: instance.id,
              contactId: recipient.contact.id,
              createdById: broadcast.createdById,
              messageType: variation.messageType,
              body: text,
              mediaUrl: variation.mediaUrl,
            })
          } catch (error) {
            const reason = (error as Error).message ?? 'Erro desconhecido'
            await this.repository.updateRecipientStatus(recipient.id, 'FAILED', {
              failedReason: reason.substring(0, 500),
            })
            await this.repository.incrementCounters(broadcastId, 'failedCount')
            failedCount++
            this.logger.error(
              `[SEND FAIL] phone=${recipient.phone} instance=${instance.name}(${instance.evolutionId}) type=${variation.messageType} — error: ${reason}`,
              (error as Error).stack,
              'BroadcastProcessor',
            )
          }

          processedInBatch++

          // Emit progress every N messages
          if (processedInBatch % PROGRESS_EMIT_INTERVAL === 0) {
            this.gateway.emitBroadcastProgress(tenantId, {
              broadcastId,
              sent: sentCount,
              failed: failedCount,
              total: broadcast.totalCount,
            })
          }

          // Wait the configured delay between messages
          if (broadcast.delay > 0) {
            await this.sleep(broadcast.delay * 1000)
          }
        }
      }

      // Clear media cache
      this.mediaBase64Cache.clear()

      // Completed
      await this.repository.updateStatus(broadcastId, 'COMPLETED', { completedAt: new Date() })
      this.gateway.emitBroadcastCompleted(tenantId, {
        broadcastId,
        sent: sentCount,
        failed: failedCount,
        total: broadcast.totalCount,
      })

      this.logger.log(
        `[DISPATCH DONE] Broadcast ${broadcastId} "${broadcast.name}" COMPLETED — sent=${sentCount} failed=${failedCount} total=${broadcast.totalCount} batches=${batchNumber}`,
        'BroadcastProcessor',
      )
    } catch (error) {
      this.mediaBase64Cache.clear()
      this.logger.error(
        `[DISPATCH FATAL] Broadcast ${broadcastId} "${broadcast.name}" FAILED after ${processedInBatch} messages (sent=${sentCount} failed=${failedCount}) — error: ${(error as Error).message}`,
        (error as Error).stack,
        'BroadcastProcessor',
      )
      await this.repository.updateStatus(broadcastId, 'FAILED')
      this.gateway.emitBroadcastFailed(tenantId, {
        broadcastId,
        reason: (error as Error).message ?? 'Erro interno',
      })
    }
  }

  /**
   * Registra a mensagem enviada no inbox: busca/cria conversa, cria Message,
   * atribui o criador do broadcast como atendente e emite eventos WebSocket.
   */
  private async registerInInbox(params: {
    tenantId: string
    instanceId: string
    contactId: string
    createdById: string
    messageType: BroadcastMessageType
    body: string
    mediaUrl: string | null
  }) {
    try {
      const { tenantId, instanceId, contactId, createdById, messageType, body, mediaUrl } = params
      const now = new Date()

      // Find active conversation or create/reopen one
      let conversation = await this.inboxRepository.findActiveConversation(
        tenantId,
        instanceId,
        contactId,
      )

      let isNewConversation = false

      if (!conversation) {
        const closedConversation = await this.inboxRepository.findConversationByContactAndInstance(
          tenantId,
          instanceId,
          contactId,
        )

        if (closedConversation) {
          conversation = await this.inboxRepository.reopenConversation(tenantId, closedConversation.id)
          isNewConversation = true
        } else {
          const protocol = await this.tenantsService.getNextProtocol(tenantId)
          conversation = await this.inboxRepository.createConversation({
            tenantId,
            instanceId,
            contactId,
            protocol,
            lastMessageAt: now,
          })
          isNewConversation = true
        }
      }

      // Assign broadcast creator as the conversation attendant
      if (!conversation.assignedToId || conversation.assignedToId !== createdById) {
        await this.inboxRepository.assignConversation(tenantId, conversation.id, createdById)
      }

      // Map broadcast message type to inbox message type
      const msgType = this.mapMessageType(messageType)

      // Create the message in inbox
      const newMessage = await this.inboxRepository.createMessage({
        tenantId,
        conversationId: conversation.id,
        fromMe: true,
        body,
        type: msgType,
        status: 'SENT',
        mediaUrl: mediaUrl ?? undefined,
      })

      // Update conversation lastMessageAt
      await this.inboxRepository.updateLastMessageAt(conversation.id)

      // Emit WebSocket events
      if (isNewConversation) {
        this.inboxGateway.emitConversationCreated(tenantId, {
          conversationId: conversation.id,
        })
      }

      this.inboxGateway.emitNewMessage(tenantId, {
        conversationId: conversation.id,
        message: {
          id: newMessage.id,
          fromMe: true,
          body: newMessage.body,
          type: newMessage.type,
          status: newMessage.status,
          mediaUrl: newMessage.mediaUrl,
          sentAt: newMessage.sentAt,
          createdAt: newMessage.createdAt,
        },
      })
    } catch (error) {
      this.logger.warn(
        `Failed to register broadcast message in inbox for contact ${params.contactId}: ${(error as Error).message}`,
        'BroadcastProcessor',
      )
    }
  }

  private mapMessageType(broadcastType: BroadcastMessageType): 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
    switch (broadcastType) {
      case 'TEXT': return 'TEXT'
      case 'IMAGE': return 'IMAGE'
      case 'VIDEO': return 'VIDEO'
      case 'AUDIO': return 'AUDIO'
      case 'DOCUMENT': return 'DOCUMENT'
      default: return 'TEXT'
    }
  }

  /**
   * Resolve a media URL: se for uma storage key, baixa do storage e converte para base64.
   * Resultado é cacheado para evitar downloads repetidos.
   */
  private async resolveMediaUrl(
    mediaUrl: string,
  ): Promise<{ url: string; mimetype: string }> {
    if (!isStorageKey(mediaUrl)) {
      return { url: mediaUrl, mimetype: 'application/octet-stream' }
    }

    const cached = this.mediaBase64Cache.get(mediaUrl)
    if (cached) return { url: cached.base64, mimetype: cached.mimetype }

    const { buffer, contentType } = await this.storage.download(mediaUrl)
    const base64 = buffer.toString('base64')
    this.mediaBase64Cache.set(mediaUrl, { base64, mimetype: contentType })
    return { url: base64, mimetype: contentType }
  }

  private async sendMessage(
    evolutionId: string,
    phone: string,
    messageType: BroadcastMessageType,
    text: string,
    mediaUrl?: string | null,
    caption?: string,
    fileName?: string | null,
  ) {
    switch (messageType) {
      case 'TEXT':
        return this.whatsapp.sendText(evolutionId, phone, text)
      case 'IMAGE': {
        const media = await this.resolveMediaUrl(mediaUrl!)
        return this.whatsapp.sendImage(evolutionId, phone, {
          url: media.url,
          mimetype: media.mimetype,
          caption: caption ?? text,
        })
      }
      case 'VIDEO': {
        const media = await this.resolveMediaUrl(mediaUrl!)
        return this.whatsapp.sendVideo(evolutionId, phone, {
          url: media.url,
          mimetype: media.mimetype,
          caption: caption ?? text,
        })
      }
      case 'AUDIO': {
        const media = await this.resolveMediaUrl(mediaUrl!)
        return this.whatsapp.sendAudio(evolutionId, phone, {
          url: media.url,
          mimetype: media.mimetype,
        })
      }
      case 'DOCUMENT': {
        const media = await this.resolveMediaUrl(mediaUrl!)
        return this.whatsapp.sendDocument(evolutionId, phone, {
          url: media.url,
          fileName: fileName ?? 'document',
          mimetype: media.mimetype,
        })
      }
      default:
        return this.whatsapp.sendText(evolutionId, phone, text)
    }
  }

  private pickRandom<T>(items: T[]): T {
    if (items.length === 1) return items[0]
    return items[Math.floor(Math.random() * items.length)]
  }

  private interpolateVariables(
    template: string,
    name?: string | null,
    phone?: string,
  ): string {
    return template
      .replace(/\{\{nome\}\}/gi, name ?? '')
      .replace(/\{\{telefone\}\}/gi, phone ?? '')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
