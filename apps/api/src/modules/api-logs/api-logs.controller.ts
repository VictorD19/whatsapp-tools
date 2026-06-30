import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { RoleGuard } from '@core/guards/role.guard'
import { Roles } from '@shared/decorators/roles.decorator'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { ApiLogsService } from './api-logs.service'
import { ListApiLogsSchema, type ListApiLogsDto } from './dto/list-api-logs.dto'

@UseGuards(RoleGuard)
@Roles('admin')
@Controller('api-logs')
export class ApiLogsController {
  constructor(private readonly service: ApiLogsService) {}

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(ListApiLogsSchema)) dto: ListApiLogsDto,
  ) {
    return this.service.findAll(tenantId, dto)
  }
}
