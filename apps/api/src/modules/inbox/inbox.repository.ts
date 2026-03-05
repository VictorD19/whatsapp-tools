import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { ConversationStatus, Prisma } from '@prisma/client'

@Injectable()
export class InboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Conversations ──

  async findConversations(
    tenantId: string,
    filters: {
      status?: ConversationStatus
      statusNot?: ConversationStatus
      assignedToId?: string
      unassigned?: boolean
      instanceId?: string
      page: number
      limit: number
    },
  ) {
    const where: Prisma.ConversationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.statusNot && { status: { not: filters.statusNot } }),
      ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
      ...(filters.unassigned && { assignedToId: null }),
      ...(filters.instanceId && { instanceId: filters.instanceId }),
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
          instance: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          messages: {
            select: { body: true, type: true, fromMe: true },
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
          deals: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              stage: { select: { id: true, name: true, color: true, type: true } },
              pipeline: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.conversation.count({ where }),
    ])

    return { conversations, total }
  }

  async findConversationById(tenantId: string, id: string) {
    return this.prisma.conversation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, phone: true, name: true, avatarUrl: true } },
        instance: { select: { id: true, name: true, evolutionId: true } },
        assignedTo: { select: { id: true, name: true } },
        messages: {
          select: { body: true, type: true, fromMe: true },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
        deals: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            stage: { select: { id: true, name: true, color: true, type: true } },
            pipeline: { select: { id: true, name: true } },
          },
        },
      },
    })
  }

  async findActiveConversation(tenantId: string, instanceId: string, contactId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        tenantId,
        instanceId,
        contactId,
        status: { not: 'CLOSE' },
        deletedAt: null,
      },
    })
  }

  async createConversation(data: {
    tenantId: string
    instanceId: string
    contactId: string
    protocol: string
    lastMessageAt: Date
  }) {
    return this.prisma.conversation.create({
      data: {
        tenantId: data.tenantId,
        instanceId: data.instanceId,
        contactId: data.contactId,
        protocol: data.protocol,
        status: 'PENDING',
        unreadCount: 1,
        lastMessageAt: data.lastMessageAt,
      },
    })
  }

  async assignConversation(tenantId: string, id: string, assignedToId: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        assignedToId,
        status: 'OPEN',
        unreadCount: 0,
      },
    })
  }

  async closeConversation(tenantId: string, id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'CLOSE',
        closedAt: new Date(),
      },
    })
  }

  async transferConversation(tenantId: string, id: string, newAssignedToId: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        assignedToId: newAssignedToId,
      },
    })
  }

  async reopenConversation(tenantId: string, id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'PENDING',
        assignedToId: null,
        closedAt: null,
      },
    })
  }

  async incrementUnreadCount(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    })
  }

  async updateLastMessageAt(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    })
  }

  async findConversationByContactAndInstance(
    tenantId: string,
    instanceId: string,
    contactId: string,
  ) {
    return this.prisma.conversation.findFirst({
      where: {
        tenantId,
        instanceId,
        contactId,
        deletedAt: null,
      },
    })
  }

  async createConversationForImport(data: {
    tenantId: string
    instanceId: string
    contactId: string
    protocol: string
    lastMessageAt: Date
    unreadCount: number
  }) {
    return this.prisma.conversation.create({
      data: {
        tenantId: data.tenantId,
        instanceId: data.instanceId,
        contactId: data.contactId,
        protocol: data.protocol,
        status: 'PENDING',
        unreadCount: data.unreadCount,
        lastMessageAt: data.lastMessageAt,
      },
    })
  }

  // ── Messages ──

  async findMessages(
    tenantId: string,
    conversationId: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.MessageWhereInput = {
      tenantId,
      conversationId,
    }

    const quotedSelect = {
      id: true,
      body: true,
      fromMe: true,
      type: true,
    } as const

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: { quotedMessage: { select: quotedSelect } },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ])

    return { messages, total }
  }

  async createMessage(data: {
    tenantId: string
    conversationId: string
    fromMe: boolean
    fromBot?: boolean
    body: string | null
    type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN'
    status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
    evolutionId?: string
    mediaUrl?: string
    quotedMessageId?: string
  }) {
    const quotedSelect = {
      id: true,
      body: true,
      fromMe: true,
      type: true,
    } as const

    return this.prisma.message.create({
      data: {
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        fromMe: data.fromMe,
        fromBot: data.fromBot ?? false,
        body: data.body,
        type: data.type ?? 'TEXT',
        status: data.status ?? 'PENDING',
        evolutionId: data.evolutionId,
        mediaUrl: data.mediaUrl,
        quotedMessageId: data.quotedMessageId,
      },
      include: { quotedMessage: { select: quotedSelect } },
    })
  }

  async createManyMessages(
    messages: Array<{
      tenantId: string
      conversationId: string
      fromMe: boolean
      body: string | null
      type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN'
      status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
      evolutionId?: string
      mediaUrl?: string
      sentAt?: Date
    }>,
  ) {
    return this.prisma.message.createMany({
      data: messages.map((msg) => ({
        tenantId: msg.tenantId,
        conversationId: msg.conversationId,
        fromMe: msg.fromMe,
        fromBot: false,
        body: msg.body,
        type: msg.type ?? 'TEXT',
        status: msg.status ?? 'DELIVERED',
        evolutionId: msg.evolutionId,
        mediaUrl: msg.mediaUrl,
        sentAt: msg.sentAt ?? new Date(),
      })),
      skipDuplicates: true,
    })
  }

  async findMessageById(tenantId: string, messageId: string) {
    return this.prisma.message.findFirst({
      where: { id: messageId, tenantId },
    })
  }

  async findMessageWithInstance(tenantId: string, messageId: string) {
    return this.prisma.message.findFirst({
      where: { id: messageId, tenantId },
      include: {
        conversation: {
          select: { instance: { select: { evolutionId: true } } },
        },
      },
    })
  }

  async findMessageByEvolutionId(evolutionId: string) {
    return this.prisma.message.findFirst({
      where: { evolutionId },
    })
  }

  async findExistingEvolutionIds(evolutionIds: string[]): Promise<Set<string>> {
    const existing = await this.prisma.message.findMany({
      where: { evolutionId: { in: evolutionIds } },
      select: { evolutionId: true },
    })
    return new Set(existing.map((m) => m.evolutionId!).filter(Boolean))
  }

  async updateMessageStatusByEvolutionId(evolutionId: string, status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED') {
    const message = await this.prisma.message.findFirst({
      where: { evolutionId },
    })
    if (!message) return null

    return this.prisma.message.update({
      where: { id: message.id },
      data: { status },
    })
  }

  async updateMessageMediaUrl(messageId: string, mediaUrl: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { mediaUrl },
    })
  }
}
