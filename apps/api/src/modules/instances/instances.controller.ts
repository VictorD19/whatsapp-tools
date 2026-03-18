import {
  Controller,
  Get,
  Post,
  Patch,
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
import { updateInstanceSchema, UpdateInstanceDto } from './dto/update-instance.dto'

@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createInstanceSchema)) dto: CreateInstanceDto,
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

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInstanceSchema)) dto: UpdateInstanceDto,
  ) {
    return this.instancesService.update(tenantId, id, dto)
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
