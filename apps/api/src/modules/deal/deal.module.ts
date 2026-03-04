import { Module } from '@nestjs/common'
import { DealController } from './deal.controller'
import { DealService } from './deal.service'
import { DealRepository } from './deal.repository'

@Module({
  controllers: [DealController],
  providers: [DealService, DealRepository],
  exports: [DealService],
})
export class DealModule {}
