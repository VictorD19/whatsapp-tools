import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { InstanceStatus } from '@prisma/client'

@Injectable()
export class InstancesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenantId: string
    name: string
    evolutionId: string
  }) {
    return this.prisma.instance.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        evolutionId: data.evolutionId,
        status: 'DISCONNECTED',
      },
    })
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.instance.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.instance.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findByEvolutionId(evolutionId: string) {
    return this.prisma.instance.findFirst({
      where: { evolutionId, deletedAt: null },
    })
  }

  async findByName(tenantId: string, name: string) {
    return this.prisma.instance.findFirst({
      where: { tenantId, name, deletedAt: null },
    })
  }

  async countByTenant(tenantId: string) {
    return this.prisma.instance.count({
      where: { tenantId, deletedAt: null },
    })
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: InstanceStatus,
    phone?: string,
  ) {
    return this.prisma.instance.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: {
        status,
        ...(phone !== undefined && { phone }),
      },
    })
  }

  async update(tenantId: string, id: string, data: { name?: string; defaultAssistantId?: string | null }) {
    return this.prisma.instance.update({
      where: { id, tenantId, deletedAt: null },
      data,
    })
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.instance.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }
}
