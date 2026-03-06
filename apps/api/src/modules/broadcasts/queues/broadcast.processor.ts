import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { BroadcastsRepository } from '../broadcasts.repository'
import { BroadcastGateway } from '../broadcasts.gateway'
import type { BroadcastJobData } from './broadcast.producer'
import type { BroadcastMessageType } from '@prisma/client'

const BATCH_CHECK_INTERVAL = 10
const PROGRESS_EMIT_INTERVAL = 5

@Injectable()
export class BroadcastProcessor implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.BROADCAST)
    private readonly queue: Queue,
    private readonly repository: BroadcastsRepository,
    private readonly whatsapp: WhatsAppService,
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
      // Process in batches of 50 to avoid loading all recipients at once
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

          // Pick random message variation to avoid bot detection
          const messageTemplate = this.pickRandom(broadcast.messageTexts)
          const text = this.interpolateVariables(
            messageTemplate,
            recipient.name ?? recipient.contact.name,
            recipient.phone,
          )

          try {
            await this.sendMessage(
              instance.evolutionId,
              recipient.phone,
              broadcast.messageType,
              text,
              broadcast.mediaUrl,
              broadcast.caption ? this.interpolateVariables(broadcast.caption, recipient.name ?? recipient.contact.name, recipient.phone) : undefined,
              broadcast.fileName,
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
      case 'IMAGE':
        return this.whatsapp.sendImage(evolutionId, phone, {
          url: mediaUrl!,
          caption: caption ?? text,
        })
      case 'VIDEO':
        return this.whatsapp.sendVideo(evolutionId, phone, {
          url: mediaUrl!,
          caption: caption ?? text,
        })
      case 'AUDIO':
        return this.whatsapp.sendAudio(evolutionId, phone, {
          url: mediaUrl!,
        })
      case 'DOCUMENT':
        return this.whatsapp.sendDocument(evolutionId, phone, {
          url: mediaUrl!,
          fileName: fileName ?? 'document',
          mimetype: 'application/octet-stream',
        })
      default:
        return this.whatsapp.sendText(evolutionId, phone, text)
    }
  }

  private pickRandom(items: string[]): string {
    if (items.length === 0) return ''
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
