import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { IntegrationsService } from './integrations.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { Public } from '@shared/decorators/current-user.decorator'
import { Roles } from '@shared/decorators/roles.decorator'
import { RoleGuard } from '@core/guards/role.guard'

@UseGuards(RoleGuard)
@Roles('admin', 'agent')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('google/connect')
  async connectGoogle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    const { url } = this.integrationsService.getConnectUrl(tenantId, user.id)
    return { url }
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ) {
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000'

    try {
      await this.integrationsService.handleCallback(code, state)
      return res.redirect(`${webUrl}/settings?connected=google_calendar`)
    } catch {
      return res.redirect(`${webUrl}/settings?error=oauth_failed`)
    }
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.integrationsService.findAll(tenantId)
  }

  @Get(':id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.integrationsService.findById(tenantId, id)
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  disconnect(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.integrationsService.disconnect(tenantId, id)
  }
}
