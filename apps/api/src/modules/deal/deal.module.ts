import { Module } from '@nestjs/common'
import { NotificationsModule } from '@modules/notifications/notifications.module'
import { MetaCapiModule } from '@modules/meta-capi/meta-capi.module'
import { DealController } from './deal.controller'
import { DealService } from './deal.service'
import { DealRepository } from './deal.repository'

@Module({
  imports: [NotificationsModule, MetaCapiModule],
  controllers: [DealController],
  providers: [DealService, DealRepository],
  exports: [DealService],
})
export class DealModule {}
