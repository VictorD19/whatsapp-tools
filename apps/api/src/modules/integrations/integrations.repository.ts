import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByTenantAndUser(tenantId: string, userId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId, userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.integration.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async create(
    tenantId: string,
    userId: string,
    provider: string,
    data: {
      providerAccountId: string
      accessToken: string
      refreshToken: string
      tokenExpiresAt: Date
      scopes: string[]
    },
  ) {
    return this.prisma.integration.create({
      data: {
        tenantId,
        userId,
        provider,
        providerAccountId: data.providerAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        scopes: data.scopes,
      },
    })
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.integration.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
  }

  async createCalendarEvent(data: {
    tenantId: string
    integrationId: string
    externalEventId: string
    title: string
    description?: string
    startAt: Date
    endAt: Date
    timezone: string
    location?: string
    attendees?: any
    hangoutLink?: string
    status: string
  }) {
    return this.prisma.calendarEvent.create({ data })
  }
}
