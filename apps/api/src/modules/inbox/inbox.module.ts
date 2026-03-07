import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { ContactsModule } from '@modules/contacts/contacts.module'
import { InstancesModule } from '@modules/instances/instances.module'
import { TenantsModule } from '@modules/tenants/tenants.module'
import { DealModule } from '@modules/deal/deal.module'
import { StorageModule } from '@modules/storage/storage.module'
import { NotificationsModule } from '@modules/notifications/notifications.module'
import { InboxController } from './inbox.controller'
import { InboxService } from './inbox.service'
import { InboxRepository } from './inbox.repository'
import { InboxGateway } from './inbox.gateway'
import { InboxWebhookProcessor } from './queues/inbox-webhook.processor'
import { WebhookInboundProducer } from './queues/webhook-inbound.producer'
import { ConversationImportProducer } from './queues/import.producer'
import { ConversationImportProcessor } from './queues/import.processor'

@Module({
  imports: [
    WhatsAppModule,
    ContactsModule,
    InstancesModule,
    TenantsModule,
    DealModule,
    StorageModule,
    NotificationsModule,
    BullModule.registerQueue(
      { name: QUEUES.WEBHOOK_INBOUND },
      { name: QUEUES.CONVERSATION_IMPORT },
      { name: QUEUES.AI_RESPONSE },
    ),
  ],
  controllers: [InboxController],
  providers: [
    InboxService,
    InboxRepository,
    InboxGateway,
    InboxWebhookProcessor,
    WebhookInboundProducer,
    ConversationImportProducer,
    ConversationImportProcessor,
  ],
  exports: [InboxService, WebhookInboundProducer, InboxGateway, InboxRepository],
})
export class InboxModule {}
