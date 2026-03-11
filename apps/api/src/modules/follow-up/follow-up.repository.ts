import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { FollowUpStatus, Prisma } from '@prisma/client'

@Injectable()
export class FollowUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.FollowUpUncheckedCreateInput) {
    return this.prisma.followUp.create({ data })
  }

  async findByConversation(
    tenantId: string,
    conversationId: string,
    filters: {
      status?: FollowUpStatus
      page: number
      limit: number
    },
  ) {
    const where: Prisma.FollowUpWhereInput = {
      tenantId,
      conversationId,
      ...(filters.status && { status: filters.status }),
    }

    const [followUps, total] = await Promise.all([
      this.prisma.followUp.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.followUp.count({ where }),
    ])

    return { followUps, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.followUp.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
    })
  }

  async cancel(tenantId: string, id: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })
  }

  async findPendingWithDetails(id: string) {
    return this.prisma.followUp.findFirst({
      where: { id, status: 'PENDING' },
      include: {
        conversation: {
          select: {
            id: true,
            tenantId: true,
            assignedToId: true,
            contact: { select: { phone: true } },
            instance: { select: { evolutionId: true } },
          },
        },
      },
    })
  }

  async markNotified(id: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: 'NOTIFIED',
        notifiedAt: new Date(),
      },
    })
  }

  async markSent(id: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })
  }
}
