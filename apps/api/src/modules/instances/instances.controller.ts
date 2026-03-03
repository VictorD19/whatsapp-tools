import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { InstancesService } from './instances.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createInstanceSchema, CreateInstanceDto } from './dto/create-instance.dto'

@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createInstanceSchema))
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateInstanceDto,
  ) {
    return this.instancesService.create(tenantId, dto)
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.instancesService.findAll(tenantId)
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.instancesService.findOne(tenantId, id)
  }

  @Post(':id/connect')
  @HttpCode(HttpStatus.OK)
  connect(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.instancesService.connect(tenantId, id)
  }

  @Post(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  disconnect(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.instancesService.disconnect(tenantId, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.instancesService.remove(tenantId, id)
  }
}
