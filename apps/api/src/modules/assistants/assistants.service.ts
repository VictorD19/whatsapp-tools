import { Injectable } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { AssistantsRepository } from './assistants.repository'
import type { CreateAssistantDto } from './dto/create-assistant.dto'
import type { UpdateAssistantDto } from './dto/update-assistant.dto'
import type { SetConversationAssistantDto } from './dto/set-conversation-assistant.dto'

@Injectable()
export class AssistantsService {
  constructor(private readonly repository: AssistantsRepository) {}

  async findAll(tenantId: string) {
    const assistants = await this.repository.findAll(tenantId)
    return { data: assistants }
  }

  async findById(tenantId: string, id: string) {
    const assistant = await this.repository.findById(tenantId, id)
    if (!assistant) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }
    return { data: assistant }
  }

  async create(tenantId: string, dto: CreateAssistantDto) {
    const assistant = await this.repository.create(tenantId, dto)
    return { data: assistant }
  }

  async update(tenantId: string, id: string, dto: UpdateAssistantDto) {
    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }

    const updated = await this.repository.update(tenantId, id, dto)
    return { data: updated }
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  async linkKnowledgeBase(tenantId: string, assistantId: string, knowledgeBaseId: string) {
    const assistant = await this.repository.findById(tenantId, assistantId)
    if (!assistant) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }

    await this.repository.linkKnowledgeBase(assistantId, knowledgeBaseId)
    const updated = await this.repository.findById(tenantId, assistantId)
    return { data: updated }
  }

  async unlinkKnowledgeBase(tenantId: string, assistantId: string, knowledgeBaseId: string) {
    const assistant = await this.repository.findById(tenantId, assistantId)
    if (!assistant) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }

    await this.repository.unlinkKnowledgeBase(assistantId, knowledgeBaseId)
    const updated = await this.repository.findById(tenantId, assistantId)
    return { data: updated }
  }

  async linkTool(tenantId: string, assistantId: string, aiToolId: string) {
    const assistant = await this.repository.findById(tenantId, assistantId)
    if (!assistant) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }

    await this.repository.linkTool(assistantId, aiToolId)
    const updated = await this.repository.findById(tenantId, assistantId)
    return { data: updated }
  }

  async unlinkTool(tenantId: string, assistantId: string, aiToolId: string) {
    const assistant = await this.repository.findById(tenantId, assistantId)
    if (!assistant) {
      throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
    }

    await this.repository.unlinkTool(assistantId, aiToolId)
    const updated = await this.repository.findById(tenantId, assistantId)
    return { data: updated }
  }

  async setConversationAssistant(
    tenantId: string,
    conversationId: string,
    dto: SetConversationAssistantDto,
  ) {
    const conversation = await this.repository.findConversation(tenantId, conversationId)
    if (!conversation) {
      throw AppException.notFound('CONVERSATION_NOT_FOUND', 'Conversa nao encontrada')
    }

    if (dto.assistantId) {
      const assistant = await this.repository.findById(tenantId, dto.assistantId)
      if (!assistant) {
        throw AppException.notFound('ASSISTANT_NOT_FOUND', 'Assistente nao encontrado')
      }
      if (!assistant.isActive) {
        throw new AppException('ASSISTANT_INACTIVE', 'Assistente esta inativo')
      }
    }

    await this.repository.setConversationAssistant(
      tenantId,
      conversationId,
      dto.assistantId,
      dto.assistantId === null,
    )

    return { data: { conversationId, assistantId: dto.assistantId } }
  }
}
