import { Module } from '@nestjs/common'
import { PlanController } from './plan.controller'
import { PlanService } from './plan.service'
import { PlanRepository } from './plan.repository'

@Module({
  controllers: [PlanController],
  providers: [PlanService, PlanRepository],
  exports: [PlanService],
})
export class PlanModule {}
