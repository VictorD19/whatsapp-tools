import { Module } from '@nestjs/common'
import { AiModule } from '@modules/ai/ai.module'
import { StorageModule } from '@modules/storage/storage.module'
import { AssistantVoicesController } from './assistant-voices.controller'
import { AssistantVoicesService } from './assistant-voices.service'
import { AssistantVoicesRepository } from './assistant-voices.repository'

@Module({
  imports: [AiModule, StorageModule],
  controllers: [AssistantVoicesController],
  providers: [AssistantVoicesService, AssistantVoicesRepository],
  exports: [AssistantVoicesService],
})
export class AssistantVoicesModule {}
