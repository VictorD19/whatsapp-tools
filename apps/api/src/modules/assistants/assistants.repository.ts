import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { CreateAssistantDto } from './dto/create-assistant.dto'
import type { UpdateAssistantDto } from './dto/update-assistant.dto'

@Injectable()
export class AssistantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    knowledgeBases: {
      include: { knowledgeBase: { select: { id: true, name: true, description: true } } },
    },
    tools: {
      include: { aiTool: { select: { id: true, name: true, description: true, type: true } } },
    },
  }

  async findAll(tenantId: string) {
    return this.prisma.assistant.findMany({
      where: { tenantId, deletedAt: null },
      include: this.includeRelations,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.assistant.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.includeRelations,
    })
  }

  async create(tenantId: string, data: CreateAssistantDto) {
    return this.prisma.assistant.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
      include: this.includeRelations,
    })
  }

  async update(tenantId: string, id: string, data: UpdateAssistantDto) {
    const result = await this.prisma.assistant.updateMany({
      where: { id, tenantId, deletedAt: null },
      data,
    })
    if (result.count === 0) return null
    return this.findById(tenantId, id)
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.assistant.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }

  async linkKnowledgeBase(assistantId: string, knowledgeBaseId: string) {
    return this.prisma.assistantKnowledgeBase.create({
      data: { assistantId, knowledgeBaseId },
    })
  }

  async unlinkKnowledgeBase(assistantId: string, knowledgeBaseId: string) {
    return this.prisma.assistantKnowledgeBase.delete({
      where: {
        assistantId_knowledgeBaseId: { assistantId, knowledgeBaseId },
      },
    })
  }

  async linkTool(assistantId: string, aiToolId: string) {
    return this.prisma.assistantTool.create({
      data: { assistantId, aiToolId },
    })
  }

  async unlinkTool(assistantId: string, aiToolId: string) {
    return this.prisma.assistantTool.delete({
      where: {
        assistantId_aiToolId: { assistantId, aiToolId },
      },
    })
  }

  async setConversationAssistant(
    tenantId: string,
    conversationId: string,
    paused: boolean,
  ) {
    return this.prisma.conversation.updateMany({
      where: { id: conversationId, tenantId },
      data: {
        assistantPausedAt: paused ? new Date() : null,
      },
    })
  }

  async findConversation(tenantId: string, conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: { id: true, assistantPausedAt: true },
    })
  }
}
