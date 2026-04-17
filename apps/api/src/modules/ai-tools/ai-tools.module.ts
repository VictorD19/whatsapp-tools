import { Module } from '@nestjs/common'
import { ContactsModule } from '@modules/contacts/contacts.module'
import { TagModule } from '@modules/tag/tag.module'
import { DealModule } from '@modules/deal/deal.module'
import { IntegrationsModule } from '@modules/integrations/integrations.module'
import { AiToolsController } from './ai-tools.controller'
import { AiToolsService } from './ai-tools.service'
import { AiToolsRepository } from './ai-tools.repository'
import { ToolExecutorService } from './definitions/tool-executor.service'

@Module({
  imports: [ContactsModule, TagModule, DealModule, IntegrationsModule],
  controllers: [AiToolsController],
  providers: [AiToolsService, AiToolsRepository, ToolExecutorService],
  exports: [AiToolsService, ToolExecutorService],
})
export class AiToolsModule {}
