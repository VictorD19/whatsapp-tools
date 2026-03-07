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
import type { ILLMProvider, ChatMessage } from '@modules/ai/ports/llm-provider.interface'
import type { AiResponseJobData } from './ai-response.producer'
import { AiToolType } from '@prisma/client'

const MAX_HISTORY_MESSAGES = 20

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
    const { conversationId, tenantId, instanceEvolutionId } = job.data

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
    if (!conversation.assistantId || conversation.assistantPausedAt) {
      this.logger.debug(
        `AI skipped: assistantId=${conversation.assistantId}, paused=${!!conversation.assistantPausedAt}`,
        'AiResponseProcessor',
      )
      return
    }

    const assistant = await this.assistantsRepository.findById(tenantId, conversation.assistantId)
    if (!assistant || !assistant.isActive) {
      this.logger.warn(
        `Assistant ${conversation.assistantId} not found or inactive`,
        'AiResponseProcessor',
      )
      return
    }

    try {
      // Busca histórico da conversa
      const { messages: history } = await this.inboxRepository.findMessages(
        tenantId,
        conversationId,
        1,
        MAX_HISTORY_MESSAGES,
      )

      // Reverte para ordem cronológica (findMessages retorna desc)
      const orderedHistory = [...history].reverse()

      // Busca contexto das KBs vinculadas
      const lastUserMessage =
        [...orderedHistory].reverse().find((m) => !m.fromMe)?.body ?? ''
      let kbContext = ''
      if (assistant.knowledgeBases.length > 0) {
        const kbIds = assistant.knowledgeBases.map((k) => k.knowledgeBaseId)
        kbContext = await this.knowledgeBaseService.searchContext(tenantId, kbIds, lastUserMessage)
      }

      // Busca tools vinculadas
      const toolIds = assistant.tools.map((t) => t.aiToolId)
      const tools = toolIds.length > 0 ? await this.aiToolsService.findByIds(tenantId, toolIds) : []

      // Monta mensagens para o LLM
      const messages = this.buildMessages(assistant, kbContext, tools, orderedHistory)

      // Chama o LLM
      const response = await this.llm.chat(messages, {
        model: assistant.model,
        temperature: 0.7,
      })

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
            conversation.assistantId,
            true,
          )
          this.logger.log(
            `Handoff triggered for conversation ${conversationId}`,
            'AiResponseProcessor',
          )
        }
      }

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

  private buildMessages(
    assistant: {
      systemPrompt: string
      handoffKeywords: string[]
    },
    kbContext: string,
    tools: Array<{ name: string; description: string | null; type: string }>,
    history: Array<{ fromMe: boolean; fromBot?: boolean; body: string | null; type: string }>,
  ): ChatMessage[] {
    const parts: string[] = [assistant.systemPrompt]

    if (kbContext) {
      parts.push(`\n\n## Contexto relevante da base de conhecimento:\n${kbContext}`)
    }

    if (tools.length > 0) {
      const toolDesc = tools.map((t) => `- ${t.name}: ${t.description ?? ''}`).join('\n')
      parts.push(
        `\n\n## Ferramentas disponíveis:\n${toolDesc}\n\nPara executar uma ferramenta, inclua [TOOL:TIPO] na sua resposta (ex: [TOOL:CRIAR_DEAL]).`,
      )
    }

    if (assistant.handoffKeywords.length > 0) {
      parts.push(
        `\n\nSe o usuário pedir para falar com um humano (palavras como: ${assistant.handoffKeywords.join(', ')}), transfira o atendimento.`,
      )
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: parts.join('') },
    ]

    for (const msg of history) {
      if (!msg.body) continue
      messages.push({
        role: msg.fromMe ? 'assistant' : 'user',
        content: msg.body,
      })
    }

    return messages
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
