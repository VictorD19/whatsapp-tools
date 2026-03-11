import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationsRepository } from './notifications.repository'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationProducer } from './queues/notification.producer'
import { NotificationProcessor } from './queues/notification.processor'
import { PushService } from './push.service'

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.NOTIFICATION })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsGateway,
    NotificationProducer,
    NotificationProcessor,
    PushService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
