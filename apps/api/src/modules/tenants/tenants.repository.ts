import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@core/database/prisma.service'
import { TenantFiltersDto } from './dto/tenant-filters.dto'

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    })
  }

  async getNextProtocol(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { protocolSeq: { increment: 1 } },
      select: { protocolPrefix: true, protocolSeq: true },
    })

    return `${tenant.protocolPrefix}${tenant.protocolSeq}`
  }

  async updateProtocolPrefix(tenantId: string, prefix: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { protocolPrefix: prefix },
      select: { protocolPrefix: true },
    })
  }

  async getProtocolSettings(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { protocolPrefix: true, protocolSeq: true },
    })
  }

  async findUsageByTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: {
          select: {
            name: true,
            maxInstances: true,
            maxUsers: true,
            maxAssistants: true,
            maxBroadcastsPerDay: true,
            maxContactsPerBroadcast: true,
          },
        },
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            instances: { where: { deletedAt: null } },
          },
        },
      },
    })
  }

  // ── Admin CRUD ──

  async findAll(filters: TenantFiltersDto) {
    const where: Prisma.TenantWhereInput = { deletedAt: null }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.planId) {
      where.planId = filters.planId
    }

    const skip = (filters.page - 1) * filters.limit

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: {
              users: { where: { deletedAt: null } },
              instances: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ])

    return { data, total }
  }

  async findByIdWithStats(id: string) {
    return this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        plan: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            instances: true,
            conversations: true,
          },
        },
      },
    })
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    })
  }

  async create(data: {
    name: string
    slug: string
    planId: string
  }) {
    return this.prisma.tenant.create({ data })
  }

  async createAdminUser(data: {
    tenantId: string
    name: string
    email: string
    password: string
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        role: 'admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
  }

  async update(id: string, data: Prisma.TenantUpdateInput) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    })
  }

  async softDelete(id: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  // ── Locale settings ──

  async getLocaleSettings(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { locale: true, timezone: true, currency: true },
    })
  }

  async updateLocaleSettings(
    tenantId: string,
    data: { locale?: string; timezone?: string; currency?: string },
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
      select: { locale: true, timezone: true, currency: true },
    })
  }
}
