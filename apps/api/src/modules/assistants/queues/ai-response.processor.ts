import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { LLM_PROVIDER, TEXT_TO_SPEECH } from '@modules/ai/ai.tokens'
import { KnowledgeBaseService } from '@modules/knowledge-base/knowledge-base.service'
import { AiToolsService } from '@modules/ai-tools/ai-tools.service'
import { ToolExecutorService, type ToolContext } from '@modules/ai-tools/definitions/tool-executor.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { StorageService } from '@modules/storage/storage.service'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { InboxGateway } from '@modules/inbox/inbox.gateway'
import { AssistantsRepository } from '../assistants.repository'
import { ConversationThreadService } from '../services/conversation-thread.service'
import type { ILLMProvider } from '@modules/ai/ports/llm-provider.interface'
import type { ITextToSpeechProvider } from '@modules/ai/ports/text-to-speech.interface'
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
    @Inject(TEXT_TO_SPEECH)
    private readonly tts: ITextToSpeechProvider,
    private readonly storage: StorageService,
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
    const t0 = Date.now()
    const elapsed = () => `${Date.now() - t0}ms`

    this.logger.log(
      `[AI-FLOW][2-START] conv=${conversationId} tenant=${tenantId} assistant=${effectiveAssistantId} — processando resposta IA`,
      'AiResponseProcessor',
    )

    // Carrega a conversa com assistente e contato
    const conversation = await this.inboxRepository.findConversationById(tenantId, conversationId)
    if (!conversation) {
      this.logger.warn(`[AI-FLOW][2-ABORT] conv=${conversationId} — conversa não encontrada`, 'AiResponseProcessor')
      return
    }

    // Verifica se o assistente ainda está ativo (não foi pausado após o job ser enfileirado)
    if (!effectiveAssistantId || conversation.assistantPausedAt) {
      this.logger.log(
        `[AI-FLOW][2-ABORT] conv=${conversationId} — assistente pausado ou ausente (assistantId=${effectiveAssistantId ?? 'NONE'}, paused=${!!conversation.assistantPausedAt})`,
        'AiResponseProcessor',
      )
      return
    }

    const assistant = await this.assistantsRepository.findById(tenantId, effectiveAssistantId)
    if (!assistant || !assistant.isActive) {
      this.logger.warn(
        `[AI-FLOW][2-ABORT] conv=${conversationId} — assistente ${effectiveAssistantId} não encontrado ou inativo`,
        'AiResponseProcessor',
      )
      return
    }

    // Busca API key do tenant
    const settings = await this.assistantsRepository.findSettings(tenantId)
    const apiKey = settings?.openaiApiKey ?? undefined

    this.logger.log(
      `[AI-FLOW][3-CONFIG] conv=${conversationId} assistant="${assistant.name}" model=${assistant.model} apiKey=${apiKey ? 'SET(' + apiKey.substring(0, 8) + '...)' : 'MISSING'} +${elapsed()}`,
      'AiResponseProcessor',
    )

    try {
      // Deal ativo mais recente vinculado à conversa (se houver)
      const activeDeal = (conversation as any).deals?.[0] as { id: string; createdAt: Date } | undefined

      // Carrega/reconstrói thread filtrando mensagens a partir do deal ativo
      const thread = await this.threadService.getOrBuild(
        tenantId,
        conversationId,
        {
          systemPrompt: assistant.systemPrompt,
          aiThreadSummary: (conversation as any).aiThreadSummary ?? null,
        },
        activeDeal ?? null,
      )

      // Última mensagem do usuário: pega da conversa (source of truth — mensagem que trigou o job)
      const lastUserMessage =
        conversation.messages.find((m) => !m.fromMe)?.body ?? ''

      // Adiciona ao thread apenas se ainda não for a última mensagem
      const lastThreadMsg = thread.messages.at(-1)
      if (lastUserMessage && (!lastThreadMsg || lastThreadMsg.role !== 'user' || lastThreadMsg.content !== lastUserMessage)) {
        this.threadService.appendMessage(thread, 'user', lastUserMessage)
      }

      this.logger.log(
        `[AI-FLOW][4-THREAD] conv=${conversationId} msgs=${thread.messages.length} deal=${activeDeal?.id ?? 'none'} lastMsg="${lastUserMessage.substring(0, 80)}" +${elapsed()}`,
        'AiResponseProcessor',
      )

      // Verifica se vai precisar comprimir antes de comprimir
      const willCompress = thread.messages.length > 20

      // Comprime se necessário (sumariza via LLM)
      await this.threadService.maybeCompress(thread, apiKey)

      // Busca contexto das KBs vinculadas
      let kbContext = ''
      if (assistant.knowledgeBases.length > 0) {
        const kbIds = assistant.knowledgeBases.map((k) => k.knowledgeBaseId)
        kbContext = await this.knowledgeBaseService.searchContext(tenantId, kbIds, lastUserMessage, apiKey)
        this.logger.log(
          `[AI-FLOW][5-KB] conv=${conversationId} kbs=${kbIds.length} contextChars=${kbContext.length} +${elapsed()}`,
          'AiResponseProcessor',
        )
      } else {
        this.logger.log(
          `[AI-FLOW][5-KB] conv=${conversationId} — sem KBs vinculadas, skip +${elapsed()}`,
          'AiResponseProcessor',
        )
      }

      // Busca tools vinculadas
      const toolIds = assistant.tools.map((t) => t.aiToolId)
      const tools = toolIds.length > 0 ? await this.aiToolsService.findByIds(tenantId, toolIds) : []

      // Monta mensagens com thread (inclui sumário + msgs recentes)
      const messages = this.threadService.buildLLMMessages(
        thread,
        { name: assistant.name, description: assistant.description ?? null },
        kbContext,
        tools,
        assistant.handoffKeywords,
      )

      this.logger.log(
        `[AI-FLOW][6-LLM-CALL] conv=${conversationId} model=${assistant.model} llmMsgs=${messages.length} tools=${tools.length} +${elapsed()}`,
        'AiResponseProcessor',
      )

      // Chama o LLM
      const response = await this.llm.chat(messages, {
        model: assistant.model,
        temperature: 0.7,
        maxTokens: 500,
        apiKey,
      })

      this.logger.log(
        `[AI-FLOW][7-LLM-OK] conv=${conversationId} tokensIn=${response.inputTokens} tokensOut=${response.outputTokens} +${elapsed()}`,
        'AiResponseProcessor',
      )

      let responseText = this.markdownToWhatsApp(response.content.trim())

      if (!responseText) {
        this.logger.warn(
          `[AI-FLOW][7-LLM-EMPTY] conv=${conversationId} — LLM retornou resposta vazia`,
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
        responseText = this.stripToolMarkers(responseText)
        this.logger.log(
          `[AI-FLOW][8-TOOLS] conv=${conversationId} executed=${toolResults.map((t) => t.toolType).join(',')} +${elapsed()}`,
          'AiResponseProcessor',
        )
      }

      // Executa handoff se necessário
      if (shouldHandoff) {
        const handoffTool = tools.find((t) => t.type === AiToolType.TRANSFERIR_HUMANO)
        if (handoffTool) {
          const handoffResult = await this.toolExecutor.execute(handoffTool, toolContext)
          if (handoffResult.output) {
            responseText = handoffResult.output
          }
          await this.assistantsRepository.setConversationAssistant(
            tenantId,
            conversationId,
            true,
          )
          this.logger.log(
            `[AI-FLOW][8-HANDOFF] conv=${conversationId} — transferido para humano +${elapsed()}`,
            'AiResponseProcessor',
          )
        }
      }

      // Adiciona resposta ao thread e salva (Redis + banco se houve compressão)
      this.threadService.appendMessage(thread, 'assistant', responseText)
      await this.threadService.save(thread, willCompress)

      // Determine if response should be audio
      const lastUserMsg = conversation.messages.find((m) => !m.fromMe)
      const lastUserType = (lastUserMsg as any)?.type ?? 'TEXT'
      const shouldSendAudio =
        assistant.audioResponseMode === 'always' ||
        (assistant.audioResponseMode === 'auto' && lastUserType === 'AUDIO')

      let savedMessageType: 'TEXT' | 'AUDIO' = 'TEXT'
      let savedMediaUrl: string | undefined
      let audioBuffer: Buffer | undefined
      let audioMimetype: string | undefined

      this.logger.log(
        `[AI-FLOW][9-AUDIO-DECISION] conv=${conversationId} audioMode=${assistant.audioResponseMode} lastUserType=${lastUserType} shouldSendAudio=${shouldSendAudio} +${elapsed()}`,
        'AiResponseProcessor',
      )

      if (shouldSendAudio) {
        this.logger.log(
          `[AI-FLOW][9-TTS] conv=${conversationId} mode=${assistant.audioResponseMode} lastUserType=${lastUserType} voice=${assistant.voiceId ?? 'default'} — gerando áudio +${elapsed()}`,
          'AiResponseProcessor',
        )
        try {
          const ttsResult = await this.tts.synthesize(responseText, {
            voiceId: assistant.voiceId,
          })
          audioBuffer = ttsResult.audioBuffer
          audioMimetype = ttsResult.mimetype
          const storageKey = await this.storage.uploadMedia(
            tenantId,
            ttsResult.audioBuffer,
            ttsResult.mimetype,
          )
          savedMediaUrl = storageKey
          savedMessageType = 'AUDIO'

          this.logger.log(
            `[AI-FLOW][9-TTS-OK] conv=${conversationId} bytes=${ttsResult.audioBuffer.length} storageKey=${storageKey} +${elapsed()}`,
            'AiResponseProcessor',
          )
        } catch (ttsError) {
          this.logger.warn(
            `[AI-FLOW][9-TTS-FAIL] conv=${conversationId} — fallback para texto: ${(ttsError as Error).message} +${elapsed()}`,
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
        type: savedMessageType,
        status: 'PENDING',
        mediaUrl: savedMediaUrl,
      })

      this.logger.log(
        `[AI-FLOW][10-SAVED] conv=${conversationId} msgId=${savedMessage.id} type=${savedMessageType} +${elapsed()}`,
        'AiResponseProcessor',
      )

      // Envia via WhatsApp
      try {
        let result: { messageId: string }
        if (savedMessageType === 'AUDIO' && audioBuffer) {
          this.logger.log(
            `[AI-FLOW][11-AUDIO-SEND] conv=${conversationId} format=base64 bytes=${audioBuffer.length} +${elapsed()}`,
            'AiResponseProcessor',
          )
          result = await this.whatsapp.sendAudio(
            instanceEvolutionId,
            conversation.contact.phone,
            { base64: audioBuffer.toString('base64'), mimetype: audioMimetype },
          )
        } else {
          result = await this.whatsapp.sendText(
            instanceEvolutionId,
            conversation.contact.phone,
            responseText,
          )
        }
        await this.inboxRepository.updateMessageStatusByEvolutionId(
          result.messageId,
          'SENT',
        )
        await this.inboxRepository.updateMessageEvolutionId(savedMessage.id, result.messageId)

        this.logger.log(
          `[AI-FLOW][11-SENT] conv=${conversationId} to=${conversation.contact.phone} type=${savedMessageType} evolutionId=${result.messageId} +${elapsed()}`,
          'AiResponseProcessor',
        )
      } catch (sendError) {
        this.logger.error(
          `[AI-FLOW][11-SEND-FAIL] conv=${conversationId} to=${conversation.contact.phone} — ${(sendError as Error).message} +${elapsed()}`,
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
          type: savedMessageType,
          status: 'PENDING',
          mediaUrl: savedMediaUrl ?? null,
          quotedMessageId: null,
          quotedMessage: null,
          sentAt: savedMessage.sentAt,
          createdAt: savedMessage.createdAt,
        },
      })

      this.logger.log(
        `[AI-FLOW][12-DONE] conv=${conversationId} totalTime=${elapsed()} tokens=${response.outputTokens} response="${responseText.substring(0, 100)}..."`,
        'AiResponseProcessor',
      )
    } catch (error) {
      this.logger.error(
        `[AI-FLOW][ERROR] conv=${conversationId} — ${(error as Error).message} +${elapsed()}`,
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

  /** Converte Markdown → formatação WhatsApp */
  private markdownToWhatsApp(text: string): string {
    return text
      // Headers → negrito
      .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
      // **bold** ou __bold__ → *bold*
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      .replace(/__(.+?)__/g, '*$1*')
      // ~~strike~~ → ~strike~
      .replace(/~~(.+?)~~/g, '~$1~')
  }
}
