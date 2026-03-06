import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { BroadcastsService } from './broadcasts.service'
import { createBroadcastSchema, type CreateBroadcastDto } from './dto/create-broadcast.dto'
import { listBroadcastsSchema, type ListBroadcastsDto } from './dto/list-broadcasts.dto'

@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createBroadcastSchema)) dto: CreateBroadcastDto,
  ) {
    return this.broadcastsService.create(tenantId, user.id, dto)
  }

  @Get()
  findMany(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(listBroadcastsSchema)) filters: ListBroadcastsDto,
  ) {
    return this.broadcastsService.list(tenantId, filters)
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.findOne(tenantId, id)
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.pause(tenantId, id)
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.resume(tenantId, id)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.cancel(tenantId, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.delete(tenantId, id)
  }
}
