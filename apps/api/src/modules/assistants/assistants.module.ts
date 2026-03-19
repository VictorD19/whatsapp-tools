import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { AiModule } from '@modules/ai/ai.module'
import { KnowledgeBaseModule } from '@modules/knowledge-base/knowledge-base.module'
import { AiToolsModule } from '@modules/ai-tools/ai-tools.module'
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module'
import { StorageModule } from '@modules/storage/storage.module'
import { InboxModule } from '@modules/inbox/inbox.module'
import { AssistantsController } from './assistants.controller'
import { AssistantsService } from './assistants.service'
import { AssistantsRepository } from './assistants.repository'
import { AiResponseProducer } from './queues/ai-response.producer'
import { AiResponseProcessor } from './queues/ai-response.processor'
import { ConversationThreadService } from './services/conversation-thread.service'

@Module({
  imports: [
    AiModule,
    KnowledgeBaseModule,
    AiToolsModule,
    WhatsAppModule,
    StorageModule,
    forwardRef(() => InboxModule),
    BullModule.registerQueue({ name: QUEUES.AI_RESPONSE }),
  ],
  controllers: [AssistantsController],
  providers: [
    AssistantsService,
    AssistantsRepository,
    AiResponseProducer,
    AiResponseProcessor,
    ConversationThreadService,
  ],
  exports: [AssistantsService, AiResponseProducer],
})
export class AssistantsModule {}
