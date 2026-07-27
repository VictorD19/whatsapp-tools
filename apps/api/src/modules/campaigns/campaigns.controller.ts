import { Controller, Get } from '@nestjs/common'
import { CampaignsService } from './campaigns.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId)
  }

  @Get('funnel')
  getFunnel(@CurrentTenant() tenantId: string) {
    return this.service.getFunnel(tenantId)
  }
}
