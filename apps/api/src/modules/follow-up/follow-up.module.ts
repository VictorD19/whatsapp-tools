import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { NotificationsModule } from '@modules/notifications/notifications.module'
import { InboxModule } from '@modules/inbox/inbox.module'
import { StorageModule } from '@modules/storage/storage.module'
import { FollowUpController } from './follow-up.controller'
import { FollowUpService } from './follow-up.service'
import { FollowUpRepository } from './follow-up.repository'
import { FollowUpProducer } from './queues/follow-up.producer'
import { FollowUpProcessor } from './queues/follow-up.processor'

@Module({
  imports: [
    WhatsAppModule,
    NotificationsModule,
    InboxModule,
    StorageModule,
    BullModule.registerQueue({ name: QUEUES.FOLLOW_UP_SCHEDULER }),
  ],
  controllers: [FollowUpController],
  providers: [
    FollowUpService,
    FollowUpRepository,
    FollowUpProducer,
    FollowUpProcessor,
  ],
  exports: [FollowUpService],
})
export class FollowUpModule {}
