import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { CreateAiToolDto } from './dto/create-ai-tool.dto'
import type { UpdateAiToolDto } from './dto/update-ai-tool.dto'

@Injectable()
export class AiToolsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.aiTool.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.aiTool.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findByIds(tenantId: string, ids: string[]) {
    return this.prisma.aiTool.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
    })
  }

  async create(tenantId: string, data: CreateAiToolDto) {
    return this.prisma.aiTool.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        type: data.type,
        config: data.config as object,
        isActive: data.isActive,
      },
    })
  }

  async update(tenantId: string, id: string, data: UpdateAiToolDto) {
    return this.prisma.aiTool.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.config !== undefined && { config: data.config as object }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.aiTool.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
