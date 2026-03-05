import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            locale: true,
            timezone: true,
            currency: true,
            plan: { select: { name: true, slug: true } },
          },
        },
      },
    })
  }

  createTenant(data: { name: string; slug: string; planId: string }) {
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        planId: data.planId,
      },
    })
  }

  createUser(data: {
    tenantId: string
    name: string
    email: string
    password: string
    role: string
  }) {
    return this.prisma.user.create({
      data,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            locale: true,
            timezone: true,
            currency: true,
            plan: { select: { name: true, slug: true } },
          },
        },
      },
    })
  }
}
