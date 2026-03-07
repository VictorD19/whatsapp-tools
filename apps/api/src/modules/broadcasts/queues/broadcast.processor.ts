import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { StorageService, isStorageKey } from '@modules/storage/storage.service'
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

    const broadcast = await this.repository.findByIdWithInstances(broadcastId)
    if (!broadcast) {
      this.logger.error(`Broadcast ${broadcastId} not found`, undefined, 'BroadcastProcessor')
      return
    }

    // Guard: skip if broadcast was cancelled or already completed
    if (['CANCELLED', 'COMPLETED', 'FAILED'].includes(broadcast.status)) {
      this.logger.log(
        `Broadcast ${broadcastId} skipped — status is ${broadcast.status}`,
        'BroadcastProcessor',
      )
      return
    }

    // Get connected instances with evolutionId for sending
    const connectedInstances = broadcast.instances
      .map((bi) => bi.instance)
      .filter((i) => i.status === 'CONNECTED')

    if (connectedInstances.length === 0) {
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

    if (variations.length === 0) {
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

    let sentCount = broadcast.sentCount
    let failedCount = broadcast.failedCount
    let instanceIndex = 0
    let processedInBatch = 0

    try {
      // Process in batches of 50
      while (true) {
        const recipients = await this.repository.findPendingRecipients(broadcastId, 50)
        if (recipients.length === 0) break

        for (const recipient of recipients) {
          // Check if broadcast was paused or cancelled
          if (processedInBatch > 0 && processedInBatch % BATCH_CHECK_INTERVAL === 0) {
            const currentStatus = await this.repository.getStatus(broadcastId)
            if (currentStatus !== 'RUNNING') {
              this.logger.log(
                `Broadcast ${broadcastId} is no longer RUNNING (status: ${currentStatus}), stopping`,
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
          } catch (error) {
            const reason = (error as Error).message ?? 'Erro desconhecido'
            await this.repository.updateRecipientStatus(recipient.id, 'FAILED', {
              failedReason: reason.substring(0, 500),
            })
            await this.repository.incrementCounters(broadcastId, 'failedCount')
            failedCount++
            this.logger.warn(
              `Failed to send to ${recipient.phone}: ${reason}`,
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
        `Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed of ${broadcast.totalCount}`,
        'BroadcastProcessor',
      )
    } catch (error) {
      this.mediaBase64Cache.clear()
      this.logger.error(
        `Broadcast ${broadcastId} fatal error: ${(error as Error).message}`,
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
