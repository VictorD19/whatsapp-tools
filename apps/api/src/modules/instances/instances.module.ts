import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { InstancesController } from './instances.controller'
import { InstancesWebhookController } from './instances-webhook.controller'
import { InstancesService } from './instances.service'
import { InstancesRepository } from './instances.repository'
import { InstancesGateway } from './instances.gateway'
import { InstanceWebhookProcessor } from './queues/instance-webhook.processor'

@Module({
  imports: [
    WhatsAppModule,
    BullModule.registerQueue({ name: QUEUES.WEBHOOK_INBOUND }),
  ],
  controllers: [InstancesController, InstancesWebhookController],
  providers: [
    InstancesService,
    InstancesRepository,
    InstancesGateway,
    InstanceWebhookProcessor,
  ],
  exports: [InstancesService],
})
export class InstancesModule {}
