import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'
import { KnowledgeBaseService } from '@modules/knowledge-base/knowledge-base.service'
import { AiToolsService } from '@modules/ai-tools/ai-tools.service'
import { ToolExecutorService, type ToolContext } from '@modules/ai-tools/definitions/tool-executor.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { InboxGateway } from '@modules/inbox/inbox.gateway'
import { AssistantsRepository } from '../assistants.repository'
import { ConversationThreadService } from '../services/conversation-thread.service'
import type { ILLMProvider } from '@modules/ai/ports/llm-provider.interface'
import type { AiResponseJobData } from './ai-response.producer'
import { AiToolType } from '@prisma/client'

@Injectable()
export class AiResponseProcessor implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.AI_RESPONSE)
    private readonly queue: Queue,
    private readonly assistantsRepository: AssistantsRepository,
    private readonly inboxRepository: InboxRepository,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly aiToolsService: AiToolsService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly whatsapp: WhatsAppService,
    private readonly gateway: InboxGateway,
    @Inject(LLM_PROVIDER)
    private readonly llm: ILLMProvider,
    private readonly threadService: ConversationThreadService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.queue.isReady()
    this.queue.process('process-ai-response', 3, (job: Job<AiResponseJobData>) => {
      return this.handleAiResponse(job)
    })
    this.logger.log('AI Response worker registered', 'AiResponseProcessor')
  }

  async handleAiResponse(job: Job<AiResponseJobData>) {
    const { conversationId, tenantId, instanceEvolutionId, effectiveAssistantId } = job.data

    this.logger.debug(
      `Processing AI response for conversation ${conversationId}`,
      'AiResponseProcessor',
    )

    // Carrega a conversa com assistente e contato
    const conversation = await this.inboxRepository.findConversationById(tenantId, conversationId)
    if (!conversation) {
      this.logger.warn(`Conversation ${conversationId} not found`, 'AiResponseProcessor')
      return
    }

    // Verifica se o assistente ainda está ativo (não foi pausado após o job ser enfileirado)
    if (!effectiveAssistantId || conversation.assistantPausedAt) {
      this.logger.debug(
        `AI skipped: effectiveAssistantId=${effectiveAssistantId}, paused=${!!conversation.assistantPausedAt}`,
        'AiResponseProcessor',
      )
      return
    }

    const assistant = await this.assistantsRepository.findById(tenantId, effectiveAssistantId)
    if (!assistant || !assistant.isActive) {
      this.logger.warn(
        `Assistant ${effectiveAssistantId} not found or inactive`,
        'AiResponseProcessor',
      )
      return
    }

    const t0 = Date.now()
    const step = (label: string) =>
      this.logger.debug(`[AI][${conversationId}] +${Date.now() - t0}ms — ${label}`, 'AiResponseProcessor')

    try {
      step('start')

      // Deal ativo mais recente vinculado à conversa (se houver)
      const activeDeal = (conversation as any).deals?.[0] as { id: string; createdAt: Date } | undefined

      step(`deal=${activeDeal?.id ?? 'none'} createdAt=${activeDeal?.createdAt?.toISOString() ?? '-'}`)

      // Carrega/reconstrói thread filtrando mensagens a partir do deal ativo
      // Sem deal: pega as últimas mensagens disponíveis
      const thread = await this.threadService.getOrBuild(
        tenantId,
        conversationId,
        {
          systemPrompt: assistant.systemPrompt,
          aiThreadSummary: (conversation as any).aiThreadSummary ?? null,
        },
        activeDeal ?? null,
      )

      step(`thread loaded — ${thread.messages.length} msgs (dealId=${thread.dealId ?? 'none'})`)

      // Última mensagem do usuário: pega da conversa (source of truth — mensagem que trigou o job)
      const lastUserMessage =
        conversation.messages.find((m) => !m.fromMe)?.body ?? ''

      // Adiciona ao thread apenas se ainda não for a última mensagem
      // (no cache miss, o rebuild do banco já inclui essa mensagem)
      const lastThreadMsg = thread.messages.at(-1)
      if (lastUserMessage && (!lastThreadMsg || lastThreadMsg.role !== 'user' || lastThreadMsg.content !== lastUserMessage)) {
        this.threadService.appendMessage(thread, 'user', lastUserMessage)
        step('user msg appended to thread')
      }

      // Verifica se vai precisar comprimir antes de comprimir
      const willCompress = thread.messages.length > 20

      // Comprime se necessário (sumariza via LLM)
      await this.threadService.maybeCompress(thread)

      // Busca contexto das KBs vinculadas
      let kbContext = ''
      if (assistant.knowledgeBases.length > 0) {
        const kbIds = assistant.knowledgeBases.map((k) => k.knowledgeBaseId)
        kbContext = await this.knowledgeBaseService.searchContext(tenantId, kbIds, lastUserMessage)
        step(`kb context fetched — ${kbContext.length} chars`)
      }

      // Busca tools vinculadas
      const toolIds = assistant.tools.map((t) => t.aiToolId)
      const tools = toolIds.length > 0 ? await this.aiToolsService.findByIds(tenantId, toolIds) : []

      step(`tools loaded — ${tools.length} tools`)

      // Monta mensagens com thread (inclui sumário + msgs recentes)
      const messages = this.threadService.buildLLMMessages(
        thread,
        { name: assistant.name, description: assistant.description ?? null },
        kbContext,
        tools,
        assistant.handoffKeywords,
      )

      step(`LLM payload built — ${messages.length} messages (system+history)`)

      // Log do payload enviado ao LLM
      this.logger.debug(
        `[AI][${conversationId}] payload:\n${JSON.stringify(messages, null, 2)}`,
        'AiResponseProcessor',
      )

      // Chama o LLM
      const response = await this.llm.chat(messages, {
        model: assistant.model,
        temperature: 0.7,
      })

      step(`LLM responded — ${response.inputTokens} in / ${response.outputTokens} out tokens`)

      let responseText = response.content.trim()

      if (!responseText) {
        this.logger.warn(
          `LLM returned empty response for conversation ${conversationId}`,
          'AiResponseProcessor',
        )
        return
      }

      // Contexto para execução de tools
      const toolContext: ToolContext = {
        tenantId,
        conversationId,
        contactId: conversation.contactId,
        contactPhone: conversation.contact.phone,
        contactName: conversation.contact.name ?? undefined,
      }

      // Verifica keywords de handoff
      const shouldHandoff = this.checkHandoffKeywords(responseText, assistant.handoffKeywords)

      // Executa tools marcadas na resposta (ex: [TOOL:CRIAR_DEAL])
      const toolResults = await this.executeToolsFromResponse(responseText, tools, toolContext)
      if (toolResults.length > 0) {
        // Remove marcações de tool da resposta final
        responseText = this.stripToolMarkers(responseText)
      }

      // Executa handoff se necessário
      if (shouldHandoff) {
        const handoffTool = tools.find((t) => t.type === AiToolType.TRANSFERIR_HUMANO)
        if (handoffTool) {
          const handoffResult = await this.toolExecutor.execute(handoffTool, toolContext)
          if (handoffResult.output) {
            responseText = handoffResult.output
          }
          // Pausa o assistente
          await this.assistantsRepository.setConversationAssistant(
            tenantId,
            conversationId,
            true,
          )
          this.logger.log(
            `Handoff triggered for conversation ${conversationId}`,
            'AiResponseProcessor',
          )
        }
      }

      // Adiciona resposta ao thread e salva (Redis + banco se houve compressão)
      this.threadService.appendMessage(thread, 'assistant', responseText)
      await this.threadService.save(thread, willCompress)

      // Salva mensagem da IA no banco
      const savedMessage = await this.inboxRepository.createMessage({
        tenantId,
        conversationId,
        fromMe: true,
        fromBot: true,
        body: responseText,
        type: 'TEXT',
        status: 'PENDING',
      })

      // Envia via WhatsApp
      try {
        const result = await this.whatsapp.sendText(
          instanceEvolutionId,
          conversation.contact.phone,
          responseText,
        )
        await this.inboxRepository.updateMessageStatusByEvolutionId(
          result.messageId,
          'SENT',
        )
        await this.inboxRepository.updateMessageEvolutionId(savedMessage.id, result.messageId)
      } catch (sendError) {
        this.logger.error(
          `Failed to send AI message via WhatsApp: ${(sendError as Error).message}`,
          (sendError as Error).stack,
          'AiResponseProcessor',
        )
        await this.inboxRepository.updateMessageStatus(savedMessage.id, 'FAILED')
      }

      // Emite WebSocket
      this.gateway.emitNewMessage(tenantId, {
        conversationId,
        message: {
          id: savedMessage.id,
          conversationId,
          fromMe: true,
          fromBot: true,
          body: responseText,
          type: 'TEXT',
          status: 'PENDING',
          mediaUrl: null,
          quotedMessageId: null,
          quotedMessage: null,
          sentAt: savedMessage.sentAt,
          createdAt: savedMessage.createdAt,
        },
      })

      this.logger.log(
        `AI response sent for conversation ${conversationId} (${response.outputTokens} tokens)`,
        'AiResponseProcessor',
      )
    } catch (error) {
      this.logger.error(
        `AI response failed for conversation ${conversationId}: ${(error as Error).message}`,
        (error as Error).stack,
        'AiResponseProcessor',
      )
      throw error
    }
  }

  private checkHandoffKeywords(text: string, keywords: string[]): boolean {
    if (!keywords.length) return false
    const lower = text.toLowerCase()
    return keywords.some((kw) => lower.includes(kw.toLowerCase()))
  }

  private async executeToolsFromResponse(
    text: string,
    tools: Array<{ id: string; type: string; name: string; description: string | null; config: unknown } & Record<string, unknown>>,
    context: ToolContext,
  ): Promise<Array<{ toolType: string; result: unknown }>> {
    const results: Array<{ toolType: string; result: unknown }> = []
    const toolPattern = /\[TOOL:([A-Z_]+)\]/g
    let match: RegExpExecArray | null

    while ((match = toolPattern.exec(text)) !== null) {
      const toolType = match[1]
      const tool = tools.find((t) => t.type === toolType)
      if (!tool) continue

      try {
        const result = await this.toolExecutor.execute(tool as any, context)
        results.push({ toolType, result })
      } catch (error) {
        this.logger.warn(
          `Tool ${toolType} execution failed: ${(error as Error).message}`,
          'AiResponseProcessor',
        )
      }
    }

    return results
  }

  private stripToolMarkers(text: string): string {
    return text.replace(/\[TOOL:[A-Z_]+\]/g, '').trim()
  }
}
