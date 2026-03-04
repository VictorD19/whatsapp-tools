import { Injectable } from '@nestjs/common'
import { PipelineRepository } from './pipeline.repository'
import { AppException } from '@core/errors/app.exception'
import { CreatePipelineDto } from './dto/create-pipeline.dto'
import { UpdatePipelineDto } from './dto/update-pipeline.dto'
import { CreateStageDto } from './dto/create-stage.dto'
import { UpdateStageDto } from './dto/update-stage.dto'
import { ReorderStagesDto } from './dto/reorder-stages.dto'
import { PipelineStageType } from '@prisma/client'

const DEFAULT_STAGES: Array<{
  name: string
  color: string
  type: PipelineStageType
  order: number
  isDefault: boolean
}> = [
  { order: 1, name: 'Novo Lead', type: 'ACTIVE', color: '#6B7280', isDefault: true },
  { order: 2, name: 'Contatado', type: 'ACTIVE', color: '#3B82F6', isDefault: false },
  { order: 3, name: 'Qualificado', type: 'ACTIVE', color: '#8B5CF6', isDefault: false },
  { order: 4, name: 'Proposta Enviada', type: 'ACTIVE', color: '#F59E0B', isDefault: false },
  { order: 5, name: 'Negociacao', type: 'ACTIVE', color: '#F97316', isDefault: false },
  { order: 6, name: 'Convertido', type: 'WON', color: '#22C55E', isDefault: false },
  { order: 7, name: 'Perdido', type: 'LOST', color: '#EF4444', isDefault: false },
]

@Injectable()
export class PipelineService {
  constructor(private readonly repository: PipelineRepository) {}

  // ── Pipelines ──

  async findAll(tenantId: string) {
    return this.repository.findAll(tenantId)
  }

  async findById(tenantId: string, id: string) {
    const pipeline = await this.repository.findById(tenantId, id)
    if (!pipeline) {
      throw AppException.notFound('PIPELINE_NOT_FOUND', 'Pipeline nao encontrado', { id })
    }
    return pipeline
  }

  async create(tenantId: string, dto: CreatePipelineDto) {
    const pipeline = await this.repository.create({
      tenantId,
      name: dto.name,
    })

    // Create default stages for the new pipeline
    for (const stage of DEFAULT_STAGES) {
      await this.repository.createStage({
        pipelineId: pipeline.id,
        ...stage,
      })
    }

    // Return pipeline with stages
    return this.repository.findById(tenantId, pipeline.id)
  }

  async update(tenantId: string, id: string, dto: UpdatePipelineDto) {
    await this.findById(tenantId, id)
    return this.repository.update(tenantId, id, { name: dto.name })
  }

  async delete(tenantId: string, id: string) {
    const pipeline = await this.findById(tenantId, id)

    if (pipeline.isDefault) {
      throw new AppException(
        'PIPELINE_IS_DEFAULT',
        'Nao e possivel excluir o pipeline padrao',
        { id },
      )
    }

    await this.repository.delete(id)
  }

  // ── Stages ──

  async findStages(tenantId: string, pipelineId: string) {
    await this.findById(tenantId, pipelineId)
    return this.repository.findStagesByPipelineId(pipelineId)
  }

  async createStage(tenantId: string, pipelineId: string, dto: CreateStageDto) {
    await this.findById(tenantId, pipelineId)

    const maxOrder = await this.repository.getMaxStageOrder(pipelineId)

    return this.repository.createStage({
      pipelineId,
      name: dto.name,
      color: dto.color,
      type: dto.type,
      order: maxOrder + 1,
    })
  }

  async updateStage(
    tenantId: string,
    pipelineId: string,
    stageId: string,
    dto: UpdateStageDto,
  ) {
    await this.findById(tenantId, pipelineId)

    const stage = await this.repository.findStageById(pipelineId, stageId)
    if (!stage) {
      throw AppException.notFound('PIPELINE_STAGE_NOT_FOUND', 'Estagio nao encontrado', { stageId })
    }

    // If changing the type, validate minimum stage type constraints
    if (dto.type && dto.type !== stage.type) {
      await this.validateStageTypeChange(pipelineId, stage.type, dto.type)
    }

    return this.repository.updateStage(stageId, {
      name: dto.name,
      color: dto.color,
      type: dto.type,
    })
  }

  async deleteStage(tenantId: string, pipelineId: string, stageId: string) {
    await this.findById(tenantId, pipelineId)

    const stage = await this.repository.findStageById(pipelineId, stageId)
    if (!stage) {
      throw AppException.notFound('PIPELINE_STAGE_NOT_FOUND', 'Estagio nao encontrado', { stageId })
    }

    if (stage.isDefault) {
      throw new AppException(
        'PIPELINE_STAGE_IS_DEFAULT',
        'Nao e possivel excluir o estagio padrao',
        { stageId },
      )
    }

    const dealCount = await this.repository.countDealsByStageId(stageId)
    if (dealCount > 0) {
      throw new AppException(
        'PIPELINE_STAGE_HAS_DEALS',
        'Nao e possivel excluir estagio com deals vinculados',
        { stageId, dealCount },
      )
    }

    // Validate minimum stage type constraints (removing this stage)
    await this.validateStageTypeRemoval(pipelineId, stage.type)

    await this.repository.deleteStage(stageId)
  }

  async reorderStages(tenantId: string, pipelineId: string, dto: ReorderStagesDto) {
    await this.findById(tenantId, pipelineId)

    // Verify all stage IDs belong to this pipeline
    const existingStages = await this.repository.findStagesByPipelineId(pipelineId)
    const existingIds = new Set(existingStages.map((s) => s.id))

    for (const stage of dto.stages) {
      if (!existingIds.has(stage.id)) {
        throw AppException.notFound('PIPELINE_STAGE_NOT_FOUND', 'Estagio nao encontrado', {
          stageId: stage.id,
        })
      }
    }

    await this.repository.reorderStages(dto.stages)

    return this.repository.findStagesByPipelineId(pipelineId)
  }

  // ── Seed ──

  async createDefaultPipeline(tenantId: string) {
    return this.repository.createDefaultPipeline(tenantId, DEFAULT_STAGES)
  }

  // ── Private helpers ──

  private async validateStageTypeChange(
    pipelineId: string,
    currentType: PipelineStageType,
    newType: PipelineStageType,
  ) {
    // If changing away from a type, ensure at least 1 remains of that type
    const count = await this.repository.countStagesByType(pipelineId, currentType)
    if (count <= 1) {
      this.throwMinimumTypeError(currentType)
    }
  }

  private async validateStageTypeRemoval(
    pipelineId: string,
    type: PipelineStageType,
  ) {
    const count = await this.repository.countStagesByType(pipelineId, type)
    if (count <= 1) {
      this.throwMinimumTypeError(type)
    }
  }

  private throwMinimumTypeError(type: PipelineStageType): never {
    switch (type) {
      case 'ACTIVE':
        throw new AppException(
          'PIPELINE_REQUIRES_ACTIVE_STAGE',
          'Pipeline precisa ter pelo menos um estagio ACTIVE',
        )
      case 'WON':
        throw new AppException(
          'PIPELINE_REQUIRES_WON_STAGE',
          'Pipeline precisa ter pelo menos um estagio WON',
        )
      case 'LOST':
        throw new AppException(
          'PIPELINE_REQUIRES_LOST_STAGE',
          'Pipeline precisa ter pelo menos um estagio LOST',
        )
    }
  }
}
