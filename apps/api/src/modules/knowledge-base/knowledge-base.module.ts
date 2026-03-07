import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { AiModule } from '@modules/ai/ai.module'
import { StorageModule } from '@modules/storage/storage.module'
import { KnowledgeBaseController } from './knowledge-base.controller'
import { KnowledgeBaseService } from './knowledge-base.service'
import { KnowledgeBaseRepository } from './knowledge-base.repository'
import { KbIngestionProducer } from './queues/kb-ingestion.producer'
import { KbIngestionProcessor } from './queues/kb-ingestion.processor'

@Module({
  imports: [
    AiModule,
    StorageModule,
    BullModule.registerQueue({ name: QUEUES.KB_INGESTION }),
  ],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    KnowledgeBaseRepository,
    KbIngestionProducer,
    KbIngestionProcessor,
  ],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
