import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import { RoleGuard } from '@core/guards/role.guard'
import { Roles } from '@shared/decorators/roles.decorator'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { MetaCapiService } from './meta-capi.service'
import {
  upsertMetaCapiConfigSchema,
  META_CAPI_EVENTS,
  type UpsertMetaCapiConfigDto,
} from './dto/upsert-meta-capi-config.dto'

const testEventSchema = z.object({
  eventName: z.enum(META_CAPI_EVENTS).optional(),
})

@UseGuards(RoleGuard)
@Roles('admin')
@Controller('meta-capi')
export class MetaCapiController {
  constructor(private readonly metaCapiService: MetaCapiService) {}

  @Get('config')
  getConfig(@CurrentTenant() tenantId: string) {
    return this.metaCapiService.getConfig(tenantId)
  }

  @Put('config')
  upsertConfig(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(upsertMetaCapiConfigSchema)) dto: UpsertMetaCapiConfigDto,
  ) {
    return this.metaCapiService.upsertConfig(tenantId, dto)
  }

  @Delete('config')
  @HttpCode(HttpStatus.OK)
  removeConfig(@CurrentTenant() tenantId: string) {
    return this.metaCapiService.removeConfig(tenantId)
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  testEvent(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(testEventSchema)) body: { eventName?: typeof META_CAPI_EVENTS[number] },
  ) {
    return this.metaCapiService.testEvent(tenantId, body.eventName)
  }
}
