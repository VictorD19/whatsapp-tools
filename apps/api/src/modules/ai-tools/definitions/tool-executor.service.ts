import { Injectable, HttpStatus, Inject } from '@nestjs/common'
import { AiTool, AiToolType } from '@prisma/client'
import { ContactsService } from '@modules/contacts/contacts.service'
import { TagService } from '@modules/tag/tag.service'
import { DealService } from '@modules/deal/deal.service'
import { IntegrationsService } from '@modules/integrations/integrations.service'
import { IntegrationsRepository } from '@modules/integrations/integrations.repository'
import { CALENDAR_PROVIDER } from '@modules/integrations/integrations.tokens'
import type { ICalendarProvider } from '@modules/integrations/ports/calendar-provider.interface'
import { MetaCapiService } from '@modules/meta-capi/meta-capi.service'
import type { MetaCapiEventName } from '@modules/meta-capi/dto/upsert-meta-capi-config.dto'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { ApiLogsService } from '@modules/api-logs/api-logs.service'

export interface ToolContext {
  tenantId: string
  conversationId: string
  contactId: string
  contactPhone: string
  contactName?: string
  assistantId?: string
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
    @Inject(CALENDAR_PROVIDER)
    private readonly calendarProvider: ICalendarProvider,
    private readonly integrationsService: IntegrationsService,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly metaCapiService: MetaCapiService,
    private readonly logger: LoggerService,
    private readonly apiLogs: ApiLogsService,
  ) {}

  async execute(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const t0 = Date.now()
    try {
      let result: ToolResult
      switch (tool.type) {
        case AiToolType.BUSCAR_CONTATO:
          result = await this.executeBuscarContato(context)
          break
        case AiToolType.CRIAR_CONTATO:
          result = await this.executeCriarContato(context)
          break
        case AiToolType.ADICIONAR_TAG:
          result = await this.executeAdicionarTag(tool, context)
          break
        case AiToolType.CRIAR_DEAL:
          result = await this.executeCriarDeal(tool, context)
          break
        case AiToolType.TRANSFERIR_HUMANO:
          result = this.executeTransferirHumano(tool)
          break
        case AiToolType.WEBHOOK_EXTERNO:
          result = await this.executeWebhookExterno(tool, context)
          break
        case AiToolType.SETAR_ETAPA_PIPELINE:
          result = await this.executeSetarEtapaPipeline(tool, context)
          break
        case AiToolType.CONSULTAR_DISPONIBILIDADE:
          result = await this.executeConsultarDisponibilidade(tool, context)
          break
        case AiToolType.CRIAR_EVENTO:
          result = await this.executeCriarEvento(tool, context)
          break
        case AiToolType.DISPARAR_EVENTO_META:
          result = await this.executeDispararEventoMeta(tool, context)
          break
        default:
          result = { success: false, output: `Tipo de ferramenta desconhecido: ${tool.type}` }
      }
      void this.apiLogs.record({
        tenantId: context.tenantId,
        type: 'TOOL_EXECUTION',
        status: result.success ? 'SUCCESS' : 'ERROR',
        conversationId: context.conversationId,
        assistantId: context.assistantId,
        toolType: tool.type,
        toolName: tool.name,
        outputSummary: result.output.substring(0, 500),
        durationMs: Date.now() - t0,
      })
      return result
    } catch (error) {
      void this.apiLogs.record({
        tenantId: context.tenantId,
        type: 'TOOL_EXECUTION',
        status: 'ERROR',
        conversationId: context.conversationId,
        assistantId: context.assistantId,
        toolType: tool.type,
        toolName: tool.name,
        errorMessage: (error as Error).message.substring(0, 500),
        durationMs: Date.now() - t0,
      })
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

  private async executeConsultarDisponibilidade(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as {
      integrationId: string
      lookAheadDays: number
      slotDurationMinutes: number
      workingHours: { start: string; end: string; workingDays: number[] }
    }

    try {
      const accessToken = await this.integrationsService.getDecryptedAccessToken(
        context.tenantId,
        config.integrationId,
      )

      const from = new Date()
      const to = new Date(from.getTime() + config.lookAheadDays * 24 * 60 * 60 * 1000)

      const slots = await this.calendarProvider.getFreeSlots(
        accessToken,
        from,
        to,
        config.slotDurationMinutes,
        config.workingHours,
      )

      if (slots.length === 0) {
        return { success: true, output: 'Nenhum horário disponível nos próximos dias.' }
      }

      const formatted = slots.slice(0, 20).map((s) => {
        const date = s.startAt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
        const time = s.startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        return `${date} às ${time}`
      })

      return {
        success: true,
        output: `Horários disponíveis:\n${formatted.join('\n')}`,
        data: { slots: slots.slice(0, 20) },
      }
    } catch (error) {
      return {
        success: false,
        output: `Erro ao consultar disponibilidade: ${(error as Error).message}`,
      }
    }
  }

  private async executeCriarEvento(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as {
      integrationId: string
      defaultDurationMinutes: number
      defaultLocation?: string
      timezone: string
      createMeetLink: boolean
    }

    try {
      const accessToken = await this.integrationsService.getDecryptedAccessToken(
        context.tenantId,
        config.integrationId,
      )

      const startAt = new Date()
      const endAt = new Date(startAt.getTime() + config.defaultDurationMinutes * 60_000)
      const title = `Reunião - ${context.contactName ?? context.contactPhone}`
      const description = `Agendado via WhatsApp por ${context.contactName ?? context.contactPhone}`

      const result = await this.calendarProvider.createEvent(accessToken, {
        title,
        description,
        startAt,
        endAt,
        timezone: config.timezone,
        location: config.defaultLocation,
        createMeetLink: config.createMeetLink,
      })

      await this.integrationsRepository.createCalendarEvent({
        tenantId: context.tenantId,
        integrationId: config.integrationId,
        externalEventId: result.eventId,
        title,
        description,
        startAt,
        endAt,
        timezone: config.timezone,
        location: config.defaultLocation,
        hangoutLink: result.hangoutLink,
        status: 'confirmed',
        assistantId: context.assistantId,
      })

      return {
        success: true,
        output: `Evento criado!\nLink: ${result.htmlLink}${result.hangoutLink ? `\nMeet: ${result.hangoutLink}` : ''}`,
        data: { eventId: result.eventId, htmlLink: result.htmlLink, hangoutLink: result.hangoutLink },
      }
    } catch (error) {
      return {
        success: false,
        output: `Erro ao criar evento: ${(error as Error).message}`,
      }
    }
  }

  private async executeDispararEventoMeta(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as { eventName: MetaCapiEventName }

    this.logger.log(
      `[DISPARAR_EVENTO_META] Iniciando disparo — evento="${config.eventName}" tenant=${context.tenantId} contactId=${context.contactId} phone=${context.contactPhone}`,
      'ToolExecutorService',
    )

    await this.metaCapiService.fireEvent({
      tenantId: context.tenantId,
      eventName: config.eventName,
      externalId: context.contactId,
      phone: context.contactPhone,
      firstName: context.contactName?.split(' ')[0],
      lastName: context.contactName?.split(' ').slice(1).join(' ') || undefined,
    })

    this.logger.log(
      `[DISPARAR_EVENTO_META] Concluído — evento="${config.eventName}" tenant=${context.tenantId}`,
      'ToolExecutorService',
    )

    return {
      success: true,
      output: `Evento "${config.eventName}" enviado para o Meta`,
      data: { eventName: config.eventName },
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
