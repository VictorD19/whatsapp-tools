import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { CreateAssistantDto } from './dto/create-assistant.dto'
import type { UpdateAssistantDto } from './dto/update-assistant.dto'
import type { UpdateAssistantSettingsDto } from './dto/update-assistant-settings.dto'

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

  async findSettings(tenantId: string) {
    return this.prisma.assistantSetting.findUnique({
      where: { tenantId },
    })
  }

  /**
   * Contato + conversa reservados exclusivamente para o playground de testes.
   * Marcados com `isSandbox` para nunca aparecerem na inbox ou lista de contatos.
   * A conversa só é criada se o tenant possuir ao menos uma instância (FK obrigatória).
   */
  async getOrCreateSandbox(tenantId: string) {
    const SANDBOX_PHONE = '00000000000'
    const SANDBOX_PROTOCOL = 'PLAYGROUND'

    const contact = await this.prisma.contact.upsert({
      where: { tenantId_phone: { tenantId, phone: SANDBOX_PHONE } },
      create: { tenantId, phone: SANDBOX_PHONE, name: 'Playground (teste)', isSandbox: true },
      update: {},
    })

    const instance = await this.prisma.instance.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    if (!instance) {
      return { contact, conversation: null }
    }

    const conversation = await this.prisma.conversation.upsert({
      where: { tenantId_protocol: { tenantId, protocol: SANDBOX_PROTOCOL } },
      create: {
        tenantId,
        instanceId: instance.id,
        contactId: contact.id,
        protocol: SANDBOX_PROTOCOL,
        status: 'OPEN',
        isSandbox: true,
      },
      update: {},
    })

    return { contact, conversation }
  }

  async upsertSettings(tenantId: string, data: UpdateAssistantSettingsDto) {
    return this.prisma.assistantSetting.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    })
  }
}
