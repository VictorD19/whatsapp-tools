import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { Prisma } from '@prisma/client'

const userSelect = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  role: true,
  isSuperAdmin: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    filters: {
      role?: string
      search?: string
      page: number
      limit: number
      includeDeleted: boolean
    },
  ) {
    const where: Prisma.UserWhereInput = {
      tenantId,
      ...(!filters.includeDeleted && { deletedAt: null }),
      ...(filters.role && { role: filters.role }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { email: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.user.count({ where }),
    ])

    return { users, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId },
      select: userSelect,
    })
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email },
      select: userSelect,
    })
  }

  async countAdmins(tenantId: string) {
    return this.prisma.user.count({
      where: { tenantId, role: 'admin', deletedAt: null },
    })
  }

  async create(data: {
    tenantId: string
    name: string
    email: string
    password: string
    role: string
  }) {
    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      },
      select: userSelect,
    })
  }

  async update(tenantId: string, id: string, data: { name?: string; role?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    })
  }

  async updatePassword(tenantId: string, id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: passwordHash },
      select: userSelect,
    })
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: userSelect,
    })
  }
}
