import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@core/database/prisma.service'
import { PlanFiltersDto } from './dto/plan-filters.dto'

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: PlanFiltersDto) {
    const where: Prisma.PlanWhereInput = {}

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    const skip = (filters.page - 1) * filters.limit

    const [data, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: {
              tenants: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.plan.count({ where }),
    ])

    return { data, total }
  }

  async findActive() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        maxInstances: true,
        maxUsers: true,
        isDefault: true,
      },
    })
  }

  async findById(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tenants: { where: { deletedAt: null } },
          },
        },
      },
    })
  }

  async findBySlug(slug: string) {
    return this.prisma.plan.findUnique({ where: { slug } })
  }

  async findDefault() {
    return this.prisma.plan.findFirst({ where: { isDefault: true, isActive: true } })
  }

  async create(data: Prisma.PlanCreateInput) {
    return this.prisma.plan.create({ data })
  }

  async update(id: string, data: Prisma.PlanUpdateInput) {
    return this.prisma.plan.update({ where: { id }, data })
  }

  async clearDefaultFlag() {
    return this.prisma.plan.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  async countActiveTenants(planId: string) {
    return this.prisma.tenant.count({
      where: { planId, deletedAt: null },
    })
  }
}
