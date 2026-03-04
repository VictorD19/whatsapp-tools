import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class DealRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Deals ──

  async findDeals(
    tenantId: string,
    filters: {
      stageId?: string
      assignedToId?: string
      contactId?: string
      pipelineId?: string
      page: number
      limit: number
    },
  ) {
    const where: Prisma.DealWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.stageId && { stageId: filters.stageId }),
      ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
      ...(filters.contactId && { contactId: filters.contactId }),
      ...(filters.pipelineId && { pipelineId: filters.pipelineId }),
    }

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: {
          contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
          stage: { select: { id: true, name: true, color: true, type: true, order: true } },
          pipeline: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.deal.count({ where }),
    ])

    return { deals, total }
  }

  async findDealById(tenantId: string, id: string) {
    return this.prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
        stage: { select: { id: true, name: true, color: true, type: true, order: true } },
        pipeline: { select: { id: true, name: true } },
        conversation: { select: { id: true, protocol: true, status: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
  }

  async findActiveDealByContact(tenantId: string, contactId: string) {
    return this.prisma.deal.findFirst({
      where: {
        tenantId,
        contactId,
        deletedAt: null,
        stage: { type: 'ACTIVE' },
      },
      include: {
        stage: { select: { id: true, name: true, type: true } },
      },
    })
  }

  async createDeal(data: {
    tenantId: string
    pipelineId: string
    stageId: string
    contactId: string
    conversationId?: string
    title?: string
    value?: number
  }) {
    return this.prisma.deal.create({
      data: {
        tenantId: data.tenantId,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        contactId: data.contactId,
        conversationId: data.conversationId,
        title: data.title,
        value: data.value,
      },
      include: {
        contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
        stage: { select: { id: true, name: true, color: true, type: true, order: true } },
        pipeline: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
  }

  async updateDeal(
    id: string,
    data: {
      title?: string
      value?: number
      assignedToId?: string | null
    },
  ) {
    return this.prisma.deal.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      },
      include: {
        contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
        stage: { select: { id: true, name: true, color: true, type: true, order: true } },
        pipeline: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
  }

  async moveDeal(
    id: string,
    data: {
      stageId: string
      wonAt?: Date | null
      lostAt?: Date | null
      lostReason?: string | null
    },
  ) {
    return this.prisma.deal.update({
      where: { id },
      data: {
        stageId: data.stageId,
        wonAt: data.wonAt,
        lostAt: data.lostAt,
        lostReason: data.lostReason,
      },
      include: {
        contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
        stage: { select: { id: true, name: true, color: true, type: true, order: true } },
        pipeline: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
  }

  async softDeleteDeal(id: string) {
    return this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async updateConversationId(id: string, conversationId: string) {
    return this.prisma.deal.update({
      where: { id },
      data: { conversationId },
    })
  }

  // ── Pipeline & Stage helpers ──

  async findDefaultPipeline(tenantId: string) {
    return this.prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
    })
  }

  async findDefaultStage(pipelineId: string) {
    return this.prisma.pipelineStage.findFirst({
      where: { pipelineId, isDefault: true },
    })
  }

  async findStageById(stageId: string) {
    return this.prisma.pipelineStage.findFirst({
      where: { id: stageId },
    })
  }

  // ── Deal Notes ──

  async findNotes(dealId: string, tenantId: string) {
    return this.prisma.dealNote.findMany({
      where: { dealId, tenantId },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createNote(data: {
    dealId: string
    tenantId: string
    authorId: string
    content: string
  }) {
    return this.prisma.dealNote.create({
      data: {
        dealId: data.dealId,
        tenantId: data.tenantId,
        authorId: data.authorId,
        content: data.content,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })
  }
}
