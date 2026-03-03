import { Module } from '@nestjs/common'
import { InboxController } from './inbox.controller'
import { InboxService } from './inbox.service'
import { InboxRepository } from './inbox.repository'

@Module({
  controllers: [InboxController],
  providers: [InboxService, InboxRepository],
  exports: [InboxService],
})
export class InboxModule {}
