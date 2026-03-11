import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { FollowUpRepository } from '../follow-up.repository'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { NotificationsService } from '@modules/notifications/notifications.service'
import { FollowUpJobData } from './follow-up.producer'

@Processor(QUEUES.FOLLOW_UP_SCHEDULER)
export class FollowUpProcessor {
  constructor(
    private readonly repository: FollowUpRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly notifications: NotificationsService,
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
    followUp: { id: string; message: string | null },
    conversation: {
      id: string
      tenantId: string
      assignedToId: string | null
      contact: { phone: string }
      instance: { evolutionId: string }
    },
  ) {
    if (!followUp.message) {
      this.logger.warn(
        `AUTOMATIC follow-up ${followUp.id} has no message, falling back to REMINDER`,
        'FollowUpProcessor',
      )
      await this.dispatchReminder(followUp.id, conversation)
      return
    }

    try {
      await this.whatsapp.sendText(
        conversation.instance.evolutionId,
        conversation.contact.phone,
        followUp.message,
      )

      await this.repository.markSent(followUp.id)

      this.logger.log(
        `AUTOMATIC follow-up ${followUp.id} sent to ${conversation.contact.phone}`,
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
