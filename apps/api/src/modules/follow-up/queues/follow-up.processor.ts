import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { FollowUpRepository } from '../follow-up.repository'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { NotificationsService } from '@modules/notifications/notifications.service'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { InboxGateway } from '@modules/inbox/inbox.gateway'
import { StorageService } from '@modules/storage/storage.service'
import { FollowUpJobData } from './follow-up.producer'

/** Normaliza mimetype com base na extensão do arquivo */
function normalizeMimetypeByExt(mimetype: string, filename: string): string {
  if (mimetype.startsWith('audio/') || mimetype.startsWith('image/') || mimetype.startsWith('video/')) return mimetype
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  const AUDIO_MAP: Record<string, string> = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4' }
  const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
  const VIDEO_EXTS = new Set(['.mp4', '.avi', '.mov', '.3gp', '.webm'])
  if (AUDIO_MAP[ext]) return AUDIO_MAP[ext]
  if (IMAGE_EXTS.has(ext)) return ext === '.png' ? 'image/png' : 'image/jpeg'
  if (VIDEO_EXTS.has(ext)) return ext === '.3gp' ? 'video/3gpp' : `video/${ext.slice(1)}`
  return mimetype
}

function resolveMediaType(mimetype: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
  if (mimetype.startsWith('image/')) return 'IMAGE'
  if (mimetype.startsWith('video/')) return 'VIDEO'
  if (mimetype.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}

@Processor(QUEUES.FOLLOW_UP_SCHEDULER)
export class FollowUpProcessor {
  constructor(
    private readonly repository: FollowUpRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly notifications: NotificationsService,
    private readonly inboxRepository: InboxRepository,
    private readonly inboxGateway: InboxGateway,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
  ) {}

  @Process('process-follow-up')
  async handle(job: Job<FollowUpJobData>) {
    const { followUpId } = job.data

    const followUp = await this.repository.findPendingWithDetails(followUpId)
    if (!followUp) {
      this.logger.debug(
        `Follow-up ${followUpId} not found or no longer PENDING, skipping`,
        'FollowUpProcessor',
      )
      return
    }

    const { conversation } = followUp

    if (followUp.mode === 'AUTOMATIC') {
      await this.handleAutomatic(followUp, conversation)
    } else {
      await this.handleReminder(followUp, conversation)
    }
  }

  private async handleAutomatic(
    followUp: {
      id: string
      message: string | null
      mediaKey: string | null
      mediaFilename: string | null
    },
    conversation: {
      id: string
      tenantId: string
      assignedToId: string | null
      contact: { phone: string }
      instance: { evolutionId: string }
    },
  ) {
    if (!followUp.message && !followUp.mediaKey) {
      this.logger.warn(
        `AUTOMATIC follow-up ${followUp.id} has no message or media, falling back to REMINDER`,
        'FollowUpProcessor',
      )
      await this.dispatchReminder(followUp.id, conversation)
      return
    }

    try {
      const contactPhone = conversation.contact.phone
      const evolutionId = conversation.instance.evolutionId
      let messageResult: { messageId: string; status: string }
      let messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'TEXT'

      if (followUp.mediaKey) {
        // Baixa arquivo do storage e envia como mídia
        const { buffer, contentType } = await this.storage.download(followUp.mediaKey)
        const filename = followUp.mediaFilename || 'arquivo'
        const resolvedMimetype = normalizeMimetypeByExt(contentType, filename)
        const mediaType = resolveMediaType(resolvedMimetype)
        messageType = mediaType
        const base64 = buffer.toString('base64')

        switch (mediaType) {
          case 'IMAGE':
            messageResult = await this.whatsapp.sendImage(evolutionId, contactPhone, {
              url: base64,
              mimetype: resolvedMimetype,
              caption: followUp.message ?? undefined,
            })
            break
          case 'VIDEO':
            messageResult = await this.whatsapp.sendVideo(evolutionId, contactPhone, {
              url: base64,
              mimetype: resolvedMimetype,
              caption: followUp.message ?? undefined,
            })
            break
          case 'AUDIO':
            messageResult = await this.whatsapp.sendAudio(evolutionId, contactPhone, {
              url: base64,
              mimetype: resolvedMimetype,
            })
            break
          default:
            messageResult = await this.whatsapp.sendDocument(evolutionId, contactPhone, {
              url: base64,
              fileName: filename,
              mimetype: resolvedMimetype,
            })
        }
      } else {
        // Apenas texto
        messageResult = await this.whatsapp.sendText(evolutionId, contactPhone, followUp.message!)
      }

      // Salva a mensagem na conversa para aparecer no inbox
      const message = await this.inboxRepository.createMessage({
        tenantId: conversation.tenantId,
        conversationId: conversation.id,
        fromMe: true,
        body: followUp.message || null,
        type: messageType,
        status: 'SENT',
        evolutionId: messageResult.messageId,
        mediaUrl: followUp.mediaKey ?? undefined,
      })

      // Atualiza lastMessageAt da conversa
      await this.inboxRepository.updateLastMessageAt(conversation.id)

      // Emite WebSocket para o frontend atualizar em tempo real
      this.inboxGateway.emitNewMessage(conversation.tenantId, {
        conversationId: conversation.id,
        message: {
          id: message.id,
          conversationId: conversation.id,
          fromMe: true,
          fromBot: false,
          body: message.body,
          type: message.type,
          status: message.status,
          mediaUrl: message.mediaUrl ?? null,
          quotedMessageId: message.quotedMessageId ?? null,
          quotedMessage: null,
          sentAt: message.sentAt,
          createdAt: message.createdAt,
        },
      })

      await this.repository.markSent(followUp.id)

      this.logger.log(
        `AUTOMATIC follow-up ${followUp.id} sent and saved to conversation ${conversation.id}`,
        'FollowUpProcessor',
      )
    } catch (error) {
      this.logger.error(
        `Failed to send AUTOMATIC follow-up ${followUp.id}: ${(error as Error).message}`,
        (error as Error).stack,
        'FollowUpProcessor',
      )
      throw error
    }
  }

  private async handleReminder(
    followUp: { id: string },
    conversation: {
      id: string
      tenantId: string
      assignedToId: string | null
      contact: { phone: string }
    },
  ) {
    await this.dispatchReminder(followUp.id, conversation)
  }

  private async dispatchReminder(
    followUpId: string,
    conversation: {
      id: string
      tenantId: string
      assignedToId: string | null
      contact: { phone: string }
    },
  ) {
    if (!conversation.assignedToId) {
      this.logger.warn(
        `Follow-up ${followUpId} reminder skipped — conversation ${conversation.id} has no assignee`,
        'FollowUpProcessor',
      )
      return
    }

    await this.notifications.dispatch({
      tenantId: conversation.tenantId,
      userId: conversation.assignedToId,
      type: 'FOLLOW_UP_DUE',
      title: 'Follow-up pendente',
      body: `Você tem um follow-up agendado para a conversa com ${conversation.contact.phone}`,
      data: { conversationId: conversation.id, followUpId },
    })

    await this.repository.markNotified(followUpId)

    this.logger.log(
      `REMINDER follow-up ${followUpId} notified to user ${conversation.assignedToId}`,
      'FollowUpProcessor',
    )
  }
}
