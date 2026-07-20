import { Module } from '@nestjs/common'
import { CampaignsController } from './campaigns.controller'
import { CampaignsService } from './campaigns.service'
import { CampaignsRepository } from './campaigns.repository'

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsRepository],
  exports: [CampaignsService],
})
export class CampaignsModule {}
