import { Module } from '@nestjs/common'
import { BroadcastsController } from './broadcasts.controller'
import { BroadcastsService } from './broadcasts.service'
import { BroadcastsRepository } from './broadcasts.repository'

@Module({
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastsRepository],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
