import { Controller, Get, Patch, Body } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import {
  updateProtocolPrefixSchema,
  UpdateProtocolPrefixDto,
} from './dto/update-protocol-prefix.dto'

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('settings/protocol')
  async getProtocolSettings(@CurrentTenant() tenantId: string) {
    const settings = await this.tenantsService.getProtocolSettings(tenantId)
    return { data: settings }
  }

  @Patch('settings/protocol-prefix')
  async updateProtocolPrefix(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(updateProtocolPrefixSchema))
    dto: UpdateProtocolPrefixDto,
  ) {
    const result = await this.tenantsService.updateProtocolPrefix(
      tenantId,
      dto.prefix,
    )
    return { data: result }
  }
}
