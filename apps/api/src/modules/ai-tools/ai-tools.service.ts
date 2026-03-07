import { Injectable } from '@nestjs/common'
import { AiToolsRepository } from './ai-tools.repository'
import { AppException } from '@core/errors/app.exception'
import type { CreateAiToolDto } from './dto/create-ai-tool.dto'
import type { UpdateAiToolDto } from './dto/update-ai-tool.dto'

@Injectable()
export class AiToolsService {
  constructor(private readonly repository: AiToolsRepository) {}

  async findAll(tenantId: string) {
    const tools = await this.repository.findAll(tenantId)
    return { data: tools }
  }

  async findById(tenantId: string, id: string) {
    const tool = await this.repository.findById(tenantId, id)
    if (!tool) {
      throw AppException.notFound('AI_TOOL_NOT_FOUND', 'Ferramenta de IA nao encontrada', { id })
    }
    return { data: tool }
  }

  async findByIds(tenantId: string, ids: string[]) {
    return this.repository.findByIds(tenantId, ids)
  }

  async create(tenantId: string, dto: CreateAiToolDto) {
    const tool = await this.repository.create(tenantId, dto)
    return { data: tool }
  }

  async update(tenantId: string, id: string, dto: UpdateAiToolDto) {
    const tool = await this.repository.findById(tenantId, id)
    if (!tool) {
      throw AppException.notFound('AI_TOOL_NOT_FOUND', 'Ferramenta de IA nao encontrada', { id })
    }

    const updated = await this.repository.update(tenantId, id, dto)
    return { data: updated }
  }

  async delete(tenantId: string, id: string) {
    const tool = await this.repository.findById(tenantId, id)
    if (!tool) {
      throw AppException.notFound('AI_TOOL_NOT_FOUND', 'Ferramenta de IA nao encontrada', { id })
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }
}
