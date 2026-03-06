import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { BroadcastsController } from './broadcasts.controller'
import { BroadcastsService } from './broadcasts.service'
import { BroadcastsRepository } from './broadcasts.repository'
import { BroadcastGateway } from './broadcasts.gateway'
import { BroadcastProducer } from './queues/broadcast.producer'
import { BroadcastProcessor } from './queues/broadcast.processor'

@Module({
  imports: [
    WhatsAppModule,
    BullModule.registerQueue({ name: QUEUES.BROADCAST }),
  ],
  controllers: [BroadcastsController],
  providers: [
    BroadcastsService,
    BroadcastsRepository,
    BroadcastGateway,
    BroadcastProducer,
    BroadcastProcessor,
  ],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
