import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { NotificationsService } from '../notifications.service'
import { CreateNotificationData } from '../notifications.repository'
import { LoggerService } from '@core/logger/logger.service'

@Processor(QUEUES.NOTIFICATION)
export class NotificationProcessor {
  constructor(
    private readonly service: NotificationsService,
    private readonly logger: LoggerService,
  ) {}

  @Process('create-notification')
  async handle(job: Job<CreateNotificationData>) {
    try {
      await this.service.createAndEmit(job.data)
    } catch (error) {
      this.logger.error(
        `Failed to process notification: ${(error as Error).message}`,
        (error as Error).stack,
        'NotificationProcessor',
      )
      throw error
    }
  }
}
