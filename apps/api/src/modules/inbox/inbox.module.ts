import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { ContactsModule } from '@modules/contacts/contacts.module'
import { InstancesModule } from '@modules/instances/instances.module'
import { InboxController } from './inbox.controller'
import { InboxService } from './inbox.service'
import { InboxRepository } from './inbox.repository'
import { InboxGateway } from './inbox.gateway'
import { InboxWebhookProcessor } from './queues/inbox-webhook.processor'
import { WebhookInboundProducer } from './queues/webhook-inbound.producer'

@Module({
  imports: [
    WhatsAppModule,
    ContactsModule,
    InstancesModule,
    BullModule.registerQueue({ name: QUEUES.WEBHOOK_INBOUND }),
  ],
  controllers: [InboxController],
  providers: [
    InboxService,
    InboxRepository,
    InboxGateway,
    InboxWebhookProcessor,
    WebhookInboundProducer,
  ],
  exports: [InboxService, WebhookInboundProducer],
})
export class InboxModule {}
