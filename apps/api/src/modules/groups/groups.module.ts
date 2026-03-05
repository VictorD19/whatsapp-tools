import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { InstancesModule } from '@modules/instances/instances.module'
import { ContactsModule } from '@modules/contacts/contacts.module'
import { InboxModule } from '@modules/inbox/inbox.module'
import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'
import { GroupsRepository } from './groups.repository'
import { GroupExtractProducer } from './queues/extract.producer'
import { GroupExtractProcessor } from './queues/extract.processor'

@Module({
  imports: [
    WhatsAppModule,
    InstancesModule,
    ContactsModule,
    InboxModule,
    BullModule.registerQueue({ name: QUEUES.GROUP_CONTACT_EXTRACT }),
  ],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    GroupsRepository,
    GroupExtractProducer,
    GroupExtractProcessor,
  ],
  exports: [GroupsService],
})
export class GroupsModule {}
