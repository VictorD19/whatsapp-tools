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
import { Response } from 'express'
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
    @Res() res: Response,
  ) {
    const { url, codeVerifier, state } = this.integrationsService.getConnectUrl(tenantId, user.id)

    res.cookie('google_oauth_verifier', codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    })

    return res.redirect(url)
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const codeVerifier = res.req.cookies?.['google_oauth_verifier']

    if (!codeVerifier) {
      return res.redirect(`${process.env.WEB_URL ?? 'http://localhost:3001'}/settings?error=oauth_expired`)
    }

    try {
      await this.integrationsService.handleCallback(code, state, codeVerifier)
      res.clearCookie('google_oauth_verifier')
      return res.redirect(`${process.env.WEB_URL ?? 'http://localhost:3001'}/settings?connected=google_calendar`)
    } catch {
      return res.redirect(`${process.env.WEB_URL ?? 'http://localhost:3001'}/settings?error=oauth_failed`)
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
