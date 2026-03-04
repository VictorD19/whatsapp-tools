import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { PipelineStageType } from '@prisma/client'

@Injectable()
export class PipelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Pipelines ──

  async findAll(tenantId: string) {
    return this.prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { deals: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { deals: true } },
      },
    })
  }

  async create(data: { tenantId: string; name: string; isDefault?: boolean }) {
    return this.prisma.pipeline.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        isDefault: data.isDefault ?? false,
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
      },
    })
  }

  async update(tenantId: string, id: string, data: { name: string }) {
    return this.prisma.pipeline.update({
      where: { id },
      data: { name: data.name },
      include: {
        stages: { orderBy: { order: 'asc' } },
      },
    })
  }

  async delete(id: string) {
    return this.prisma.pipeline.delete({
      where: { id },
    })
  }

  // ── Stages ──

  async findStagesByPipelineId(pipelineId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { order: 'asc' },
    })
  }

  async findStageById(pipelineId: string, id: string) {
    return this.prisma.pipelineStage.findFirst({
      where: { id, pipelineId },
    })
  }

  async countDealsByStageId(stageId: string) {
    return this.prisma.deal.count({
      where: { stageId, deletedAt: null },
    })
  }

  async getMaxStageOrder(pipelineId: string): Promise<number> {
    const result = await this.prisma.pipelineStage.aggregate({
      where: { pipelineId },
      _max: { order: true },
    })
    return result._max.order ?? 0
  }

  async countStagesByType(pipelineId: string, type: PipelineStageType) {
    return this.prisma.pipelineStage.count({
      where: { pipelineId, type },
    })
  }

  async createStage(data: {
    pipelineId: string
    name: string
    color: string
    type: PipelineStageType
    order: number
    isDefault?: boolean
  }) {
    return this.prisma.pipelineStage.create({
      data: {
        pipelineId: data.pipelineId,
        name: data.name,
        color: data.color,
        type: data.type,
        order: data.order,
        isDefault: data.isDefault ?? false,
      },
    })
  }

  async updateStage(
    id: string,
    data: { name?: string; color?: string; type?: PipelineStageType },
  ) {
    return this.prisma.pipelineStage.update({
      where: { id },
      data,
    })
  }

  async deleteStage(id: string) {
    return this.prisma.pipelineStage.delete({
      where: { id },
    })
  }

  async reorderStages(stages: Array<{ id: string; order: number }>) {
    return this.prisma.$transaction(
      stages.map((stage) =>
        this.prisma.pipelineStage.update({
          where: { id: stage.id },
          data: { order: stage.order },
        }),
      ),
    )
  }

  // ── Seed: create default pipeline with stages ──

  async createDefaultPipeline(
    tenantId: string,
    stages: Array<{
      name: string
      color: string
      type: PipelineStageType
      order: number
      isDefault: boolean
    }>,
  ) {
    return this.prisma.pipeline.create({
      data: {
        tenantId,
        name: 'Pipeline Padrao',
        isDefault: true,
        stages: {
          create: stages,
        },
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
      },
    })
  }
}
