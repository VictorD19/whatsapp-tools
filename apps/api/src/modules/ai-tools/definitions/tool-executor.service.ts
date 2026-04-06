import { Injectable, HttpStatus } from '@nestjs/common'
import { AiTool, AiToolType } from '@prisma/client'
import { ContactsService } from '@modules/contacts/contacts.service'
import { TagService } from '@modules/tag/tag.service'
import { DealService } from '@modules/deal/deal.service'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'

export interface ToolContext {
  tenantId: string
  conversationId: string
  contactId: string
  contactPhone: string
  contactName?: string
}

export interface ToolResult {
  success: boolean
  output: string
  data?: unknown
}

@Injectable()
export class ToolExecutorService {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly tagService: TagService,
    private readonly dealService: DealService,
    private readonly logger: LoggerService,
  ) {}

  async execute(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    try {
      switch (tool.type) {
        case AiToolType.BUSCAR_CONTATO:
          return this.executeBuscarContato(context)
        case AiToolType.CRIAR_CONTATO:
          return this.executeCriarContato(context)
        case AiToolType.ADICIONAR_TAG:
          return this.executeAdicionarTag(tool, context)
        case AiToolType.CRIAR_DEAL:
          return this.executeCriarDeal(tool, context)
        case AiToolType.TRANSFERIR_HUMANO:
          return this.executeTransferirHumano(tool)
        case AiToolType.WEBHOOK_EXTERNO:
          return this.executeWebhookExterno(tool, context)
        case AiToolType.SETAR_ETAPA_PIPELINE:
          return this.executeSetarEtapaPipeline(tool, context)
        default:
          return { success: false, output: `Tipo de ferramenta desconhecido: ${tool.type}` }
      }
    } catch (error) {
      this.logger.error(
        `Tool execution failed: ${tool.type} - ${(error as Error).message}`,
        'ToolExecutorService',
      )
      throw new AppException(
        'AI_TOOL_EXECUTION_FAILED',
        `Falha ao executar ferramenta: ${tool.name}`,
        { toolId: tool.id, type: tool.type, error: (error as Error).message },
      )
    }
  }

  private async executeBuscarContato(context: ToolContext): Promise<ToolResult> {
    const contact = await this.contactsService.findById(context.tenantId, context.contactId)

    return {
      success: true,
      output: `Contato encontrado: ${contact.name ?? 'Sem nome'}, Telefone: ${contact.phone}`,
      data: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
      },
    }
  }

  private async executeCriarContato(context: ToolContext): Promise<ToolResult> {
    const contact = await this.contactsService.findOrCreate(
      context.tenantId,
      context.contactPhone,
      context.contactName,
    )

    return {
      success: true,
      output: `Contato criado/encontrado: ${contact.name ?? 'Sem nome'}, Telefone: ${contact.phone}`,
      data: { id: contact.id, name: contact.name, phone: contact.phone },
    }
  }

  private async executeAdicionarTag(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as { tagIds: string[] }
    const results: string[] = []

    for (const tagId of config.tagIds) {
      await this.tagService.addContactTag(context.tenantId, context.contactId, tagId)
      results.push(tagId)
    }

    return {
      success: true,
      output: `${results.length} tag(s) adicionada(s) ao contato`,
      data: { tagIds: results },
    }
  }

  private async executeCriarDeal(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as { pipelineId: string; stageId: string }
    const title = `Lead - ${context.contactName ?? context.contactPhone}`

    const deal = await this.dealService.createDeal(context.tenantId, {
      contactId: context.contactId,
      conversationId: context.conversationId,
      pipelineId: config.pipelineId,
      stageId: config.stageId,
      title,
    })

    return {
      success: true,
      output: `Deal criado: ${title}`,
      data: { dealId: deal.id, title },
    }
  }

  private executeTransferirHumano(tool: AiTool): ToolResult {
    const config = tool.config as { message: string }

    return {
      success: true,
      output: config.message,
      data: { handoff: true },
    }
  }

  private async executeSetarEtapaPipeline(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as { pipelineId: string; stageId: string }

    const deal = await this.dealService.findActiveDealByContact(context.tenantId, context.contactId)

    if (!deal) {
      return {
        success: false,
        output: 'Contato não possui nenhum deal ativo para mover de etapa',
      }
    }

    try {
      await this.dealService.moveDeal(context.tenantId, deal.id, { stageId: config.stageId })
    } catch (error) {
      return {
        success: false,
        output: `Não foi possível mover o deal: ${(error as Error).message}`,
      }
    }

    return {
      success: true,
      output: `Deal ${deal.id} movido para a etapa configurada`,
      data: { dealId: deal.id, stageId: config.stageId },
    }
  }

  private async executeWebhookExterno(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as {
      url: string
      method?: string
      headers?: Record<string, string>
      bodyTemplate?: string
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const body = config.bodyTemplate
        ? config.bodyTemplate
            .replace('{{contactId}}', context.contactId)
            .replace('{{contactPhone}}', context.contactPhone)
            .replace('{{contactName}}', context.contactName ?? '')
            .replace('{{conversationId}}', context.conversationId)
            .replace('{{tenantId}}', context.tenantId)
        : JSON.stringify({
            contactId: context.contactId,
            contactPhone: context.contactPhone,
            contactName: context.contactName,
            conversationId: context.conversationId,
            tenantId: context.tenantId,
          })

      const response = await fetch(config.url, {
        method: config.method ?? 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: config.method === 'GET' ? undefined : body,
        signal: controller.signal,
      })

      const responseText = await response.text()

      return {
        success: response.ok,
        output: response.ok
          ? `Webhook executado com sucesso (${response.status})`
          : `Webhook retornou erro (${response.status}): ${responseText.slice(0, 200)}`,
        data: { status: response.status, response: responseText.slice(0, 500) },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
