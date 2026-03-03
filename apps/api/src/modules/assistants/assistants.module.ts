import { Module } from '@nestjs/common'
import { AssistantsController } from './assistants.controller'
import { AssistantsService } from './assistants.service'
import { AssistantsRepository } from './assistants.repository'

@Module({
  controllers: [AssistantsController],
  providers: [AssistantsService, AssistantsRepository],
  exports: [AssistantsService],
})
export class AssistantsModule {}
