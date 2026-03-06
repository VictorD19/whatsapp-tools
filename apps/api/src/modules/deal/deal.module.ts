import { Module } from '@nestjs/common'
import { NotificationsModule } from '@modules/notifications/notifications.module'
import { DealController } from './deal.controller'
import { DealService } from './deal.service'
import { DealRepository } from './deal.repository'

@Module({
  imports: [NotificationsModule],
  controllers: [DealController],
  providers: [DealService, DealRepository],
  exports: [DealService],
})
export class DealModule {}
