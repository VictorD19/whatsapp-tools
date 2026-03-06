import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { BroadcastStatus, Prisma } from '@prisma/client'
import type { ListBroadcastsDto } from './dto/list-broadcasts.dto'

@Injectable()
export class BroadcastsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.BroadcastCreateInput & {
      instanceIds: string[]
      sources: Array<{
        sourceType: 'CONTACT_LIST' | 'GROUP'
        contactListId?: string
        groupJid?: string
        groupName?: string
      }>
      recipients: Array<{
        contactId: string
        phone: string
        name?: string | null
      }>
      variationRecords?: Array<{
        messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
        text: string
        mediaUrl?: string
        fileName?: string
        sortOrder: number
      }>
    },
  ) {
    const { instanceIds, sources, recipients, variationRecords, ...broadcastData } = data

    return this.prisma.broadcast.create({
      data: {
        ...broadcastData,
        totalCount: recipients.length,
        instances: {
          createMany: {
            data: instanceIds.map((instanceId) => ({ instanceId })),
          },
        },
        sources: {
          createMany: {
            data: sources,
          },
        },
        recipients: {
          createMany: {
            data: recipients.map((r) => ({
              contactId: r.contactId,
              phone: r.phone,
              name: r.name,
            })),
          },
        },
        ...(variationRecords && variationRecords.length > 0
          ? {
              variations: {
                createMany: {
                  data: variationRecords.map((v) => ({
                    messageType: v.messageType,
                    text: v.text,
                    mediaUrl: v.mediaUrl,
                    fileName: v.fileName,
                    sortOrder: v.sortOrder,
                  })),
                },
              },
            }
          : {}),
      },
      include: {
        instances: { include: { instance: { select: { id: true, name: true, evolutionId: true, status: true } } } },
        variations: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { recipients: true } },
      },
    })
  }

  async findMany(tenantId: string, filters: ListBroadcastsDto) {
    const where: Prisma.BroadcastWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.search && {
        name: { contains: filters.search, mode: 'insensitive' as const },
      }),
    }

    const [broadcasts, total] = await this.prisma.$transaction([
      this.prisma.broadcast.findMany({
        where,
        include: {
          instances: { include: { instance: { select: { id: true, name: true, status: true } } } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.broadcast.count({ where }),
    ])

    return { broadcasts, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.broadcast.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        instances: { include: { instance: { select: { id: true, name: true, evolutionId: true, status: true } } } },
        sources: { include: { contactList: { select: { id: true, name: true } } } },
        variations: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    })
  }

  async findByIdWithInstances(id: string) {
    return this.prisma.broadcast.findFirst({
      where: { id, deletedAt: null },
      include: {
        tenant: { select: { id: true, timezone: true, locale: true } },
        instances: { include: { instance: { select: { id: true, name: true, evolutionId: true, status: true } } } },
        variations: { orderBy: { sortOrder: 'asc' } },
      },
    })
  }

  async updateStatus(
    id: string,
    status: BroadcastStatus,
    timestamps?: { startedAt?: Date; completedAt?: Date },
  ) {
    return this.prisma.broadcast.update({
      where: { id },
      data: { status, ...timestamps },
    })
  }

  async incrementCounters(id: string, field: 'sentCount' | 'failedCount') {
    return this.prisma.broadcast.update({
      where: { id },
      data: { [field]: { increment: 1 } },
    })
  }

  async findPendingRecipients(broadcastId: string, limit: number) {
    return this.prisma.broadcastRecipient.findMany({
      where: { broadcastId, status: 'PENDING' },
      take: limit,
      orderBy: { id: 'asc' },
      include: {
        contact: { select: { id: true, phone: true, name: true } },
      },
    })
  }

  async updateRecipientStatus(
    recipientId: string,
    status: 'SENT' | 'FAILED',
    extra?: { sentAt?: Date; failedReason?: string },
  ) {
    return this.prisma.broadcastRecipient.update({
      where: { id: recipientId },
      data: { status, ...extra },
    })
  }

  async getRecipientStats(broadcastId: string) {
    const stats = await this.prisma.broadcastRecipient.groupBy({
      by: ['status'],
      where: { broadcastId },
      _count: true,
    })
    return stats.reduce(
      (acc, s) => ({ ...acc, [s.status]: s._count }),
      {} as Record<string, number>,
    )
  }

  async findScheduledReady() {
    return this.prisma.broadcast.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
        deletedAt: null,
      },
    })
  }

  async countTodayBroadcasts(tenantId: string) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    return this.prisma.broadcast.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay },
        deletedAt: null,
      },
    })
  }

  async getTenantPlan(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    })
    return tenant?.plan ?? null
  }

  async getStatus(id: string) {
    const b = await this.prisma.broadcast.findUnique({
      where: { id },
      select: { status: true },
    })
    return b?.status ?? null
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.broadcast.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }

  async resolveContactListRecipients(tenantId: string, contactListIds: string[]) {
    if (contactListIds.length === 0) return []

    const items = await this.prisma.contactListItem.findMany({
      where: {
        contactListId: { in: contactListIds },
        contactList: { tenantId, deletedAt: null },
      },
      include: {
        contact: { select: { id: true, phone: true, name: true } },
      },
    })

    return items.map((i) => ({
      contactId: i.contact.id,
      phone: i.contact.phone,
      name: i.contact.name,
    }))
  }

  async findInstancesByIds(tenantId: string, instanceIds: string[]) {
    return this.prisma.instance.findMany({
      where: {
        id: { in: instanceIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true, evolutionId: true, status: true },
    })
  }
}
