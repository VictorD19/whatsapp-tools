import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { PipelineService } from './pipeline.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createPipelineSchema, CreatePipelineDto } from './dto/create-pipeline.dto'
import { updatePipelineSchema, UpdatePipelineDto } from './dto/update-pipeline.dto'
import { createStageSchema, CreateStageDto } from './dto/create-stage.dto'
import { updateStageSchema, UpdateStageDto } from './dto/update-stage.dto'
import { reorderStagesSchema, ReorderStagesDto } from './dto/reorder-stages.dto'

@Controller('pipelines')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  // ── Pipeline CRUD ──

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.pipelineService.findAll(tenantId)
  }

  @Get(':id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.pipelineService.findById(tenantId, id)
  }

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createPipelineSchema)) dto: CreatePipelineDto,
  ) {
    return this.pipelineService.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePipelineSchema)) dto: UpdatePipelineDto,
  ) {
    return this.pipelineService.update(tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.pipelineService.delete(tenantId, id)
  }

  // ── Stage CRUD ──

  @Get(':pipelineId/stages')
  findStages(
    @CurrentTenant() tenantId: string,
    @Param('pipelineId') pipelineId: string,
  ) {
    return this.pipelineService.findStages(tenantId, pipelineId)
  }

  @Post(':pipelineId/stages')
  createStage(
    @CurrentTenant() tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Body(new ZodValidationPipe(createStageSchema)) dto: CreateStageDto,
  ) {
    return this.pipelineService.createStage(tenantId, pipelineId, dto)
  }

  @Patch(':pipelineId/stages/reorder')
  reorderStages(
    @CurrentTenant() tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Body(new ZodValidationPipe(reorderStagesSchema)) dto: ReorderStagesDto,
  ) {
    return this.pipelineService.reorderStages(tenantId, pipelineId, dto)
  }

  @Patch(':pipelineId/stages/:id')
  updateStage(
    @CurrentTenant() tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStageSchema)) dto: UpdateStageDto,
  ) {
    return this.pipelineService.updateStage(tenantId, pipelineId, id, dto)
  }

  @Delete(':pipelineId/stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStage(
    @CurrentTenant() tenantId: string,
    @Param('pipelineId') pipelineId: string,
    @Param('id') id: string,
  ) {
    await this.pipelineService.deleteStage(tenantId, pipelineId, id)
  }
}
