import { Inject, Injectable, Logger } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { LLM_PROVIDER, TEXT_TO_SPEECH } from '@modules/ai/ai.tokens'
import type { ITextToSpeechProvider } from '@modules/ai/ports/text-to-speech.interface'
import type { ILLMProvider, ChatMessage } from '@modules/ai/ports/llm-provider.interface'
import { AiToolsService } from '@modules/ai-tools/ai-tools.service'
import { ToolExecutorService, type ToolContext } from '@modules/ai-tools/definitions/tool-executor.service'
import { KnowledgeBaseService } from '@modules/knowledge-base/knowledge-base.service'
import { StorageService } from '@modules/storage/storage.service'
import { AssistantsRepository } from './assistants.repository'
import { AssistantPromptBuilder } from './services/assistant-prompt.builder'
import type { CreateAssistantDto } from './dto/create-assistant.dto'
import type { UpdateAssistantDto } from './dto/update-assistant.dto'
import type { SetConversationAssistantDto } from './dto/set-conversation-assistant.dto'
import type { UpdateAssistantSettingsDto } from './dto/update-assistant-settings.dto'
import type { PlaygroundMessageDto } from './dto/playground-message.dto'

const PREVIEW_TEXTS: Record<string, string> = {
  'pt-BR': 'Olá! Sou seu assistente virtual. Como posso ajudá-lo hoje?',
  'en-US': 'Hello! I am your virtual assistant. How can I help you today?',
  'es-MX': 'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?',
}

@Injectable()
export class AssistantsService {
  private readonly logger = new Logger(AssistantsService.name)

  constructor(
    private readonly repository: AssistantsRepository,
    @Inject(TEXT_TO_SPEECH)
    private readonly tts: ITextToSpeechProvider,
    @Inject(LLM_PROVIDER)
    private readonly llm: ILLMProvider,
    private readonly storage: StorageService,
    private readonly aiToolsService: AiToolsService,
    private readonly toolExecutor: ToolExecutorService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

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

    // Auto-vincula tools mencionadas no systemPrompt
    if (dto.systemPrompt !== undefined) {
      await this.autoLinkToolsFromPrompt(tenantId, id, dto.systemPrompt, existing.tools.map((t) => t.aiToolId))
    }

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
    await this.repository.setConversationAssistant(tenantId, conversationId, dto.paused)
    return { data: { conversationId, paused: dto.paused } }
  }

  async getSettings(tenantId: string) {
    const settings = await this.repository.findSettings(tenantId)
    if (!settings) {
      return { data: { openaiApiKey: null, hasApiKey: false } }
    }
    return {
      data: {
        openaiApiKey: settings.openaiApiKey ? this.maskApiKey(settings.openaiApiKey) : null,
        hasApiKey: !!settings.openaiApiKey,
      },
    }
  }

  async updateSettings(tenantId: string, dto: UpdateAssistantSettingsDto) {
    await this.repository.upsertSettings(tenantId, dto)
    const hasApiKey = !!dto.openaiApiKey
    return {
      data: {
        openaiApiKey: dto.openaiApiKey ? this.maskApiKey(dto.openaiApiKey) : null,
        hasApiKey,
      },
    }
  }

  async previewVoice(voiceId: string): Promise<{ buffer: Buffer; contentType: string }> {
    const storageKey = `voice-previews/${voiceId}.mp3`

    // Tenta buscar do cache (MinIO)
    try {
      return await this.storage.download(storageKey)
    } catch {
      // Não existe ainda — gera e salva
    }

    const lang = voiceId.split('-').slice(0, 2).join('-')
    const text = PREVIEW_TEXTS[lang] ?? PREVIEW_TEXTS['pt-BR']
    const result = await this.tts.synthesize(text, { voiceId })

    // Salva no MinIO para próximas consultas
    await this.storage.uploadRaw(storageKey, result.audioBuffer, result.mimetype)

    return { buffer: result.audioBuffer, contentType: result.mimetype }
  }

  /**
   * Playground stateless: testa o rascunho atual do assistente sem persistir nada.
   * Reusa o AssistantPromptBuilder (instruções + KB + tools) para fidelidade total e,
   * quando a IA aciona uma tool ([TOOL:TIPO]), executa de verdade sobre o contato sandbox.
   */
  async playground(tenantId: string, dto: PlaygroundMessageDto) {
    const settings = await this.repository.findSettings(tenantId)
    const apiKey = settings?.openaiApiKey ?? process.env.OPENAI_API_KEY ?? undefined
    if (!apiKey) {
      throw new AppException(
        'ASSISTANT_PLAYGROUND_NO_API_KEY',
        'Configure a API key da OpenAI nas configurações de assistentes para usar o playground',
      )
    }

    const lastUserMessage = [...dto.messages].reverse().find((m) => m.role === 'user')?.content ?? ''

    // Contexto da base de conhecimento (mesma busca do fluxo real)
    let kbContext = ''
    if (dto.knowledgeBaseIds.length > 0 && lastUserMessage) {
      kbContext = await this.knowledgeBaseService.searchContext(
        tenantId,
        dto.knowledgeBaseIds,
        lastUserMessage,
        apiKey,
      )
    }

    // Tools vinculadas
    const tools = dto.aiToolIds.length > 0 ? await this.aiToolsService.findByIds(tenantId, dto.aiToolIds) : []

    const systemPrompt = AssistantPromptBuilder.build({
      name: dto.name,
      description: dto.description,
      systemPrompt: dto.systemPrompt,
      kbContext,
      tools: tools.map((t) => ({ name: t.name, type: t.type, description: t.description })),
    })

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const response = await this.llm.chat(messages, {
      model: dto.model,
      temperature: 0.7,
      maxTokens: 500,
      apiKey,
    })

    let reply = response.content.trim()

    // Executa tools acionadas na resposta (de verdade, sobre o contato sandbox)
    const executedTools: Array<{ type: string; name: string; output: string; success: boolean }> = []
    if (tools.length > 0) {
      const { contact, conversation } = await this.repository.getOrCreateSandbox(tenantId)
      const context: ToolContext = {
        tenantId,
        conversationId: conversation?.id ?? '',
        contactId: contact.id,
        contactPhone: contact.phone,
        contactName: contact.name ?? undefined,
      }

      const toolPattern = /\[TOOL:([A-Z_]+)\]/g
      let match: RegExpExecArray | null
      while ((match = toolPattern.exec(reply)) !== null) {
        const tool = tools.find((t) => t.type === match![1])
        if (!tool) continue
        try {
          const result = await this.toolExecutor.execute(tool, context)
          executedTools.push({ type: tool.type, name: tool.name, output: result.output, success: result.success })
        } catch (error) {
          executedTools.push({
            type: tool.type,
            name: tool.name,
            output: (error as Error).message,
            success: false,
          })
        }
      }

      if (executedTools.length > 0) {
        reply = reply.replace(/\[TOOL:[A-Z_]+\]/g, '').trim()
      }
    }

    return {
      data: {
        reply,
        executedTools,
        usage: { inputTokens: response.inputTokens, outputTokens: response.outputTokens },
      },
    }
  }

  /**
   * Detecta menções de tools no systemPrompt e vincula automaticamente.
   * Formato esperado: `**🔧 Nome da Tool**` (inserido pelo slash command do editor)
   */
  private async autoLinkToolsFromPrompt(
    tenantId: string,
    assistantId: string,
    systemPrompt: string,
    currentToolIds: string[],
  ) {
    // Busca todas as tools do tenant
    const { data: allTools } = await this.aiToolsService.findAll(tenantId)
    if (!allTools?.length) return

    // Detecta tools mencionadas no prompt (formato: **🔧 Nome da Tool**)
    const mentionedToolIds: string[] = []
    for (const tool of allTools) {
      // Verifica pelo nome da tool no prompt
      if (systemPrompt.includes(tool.name)) {
        mentionedToolIds.push(tool.id)
      }
    }

    // Vincula tools mencionadas que ainda não estão vinculadas
    const toLink = mentionedToolIds.filter((id) => !currentToolIds.includes(id))
    for (const toolId of toLink) {
      const tool = allTools.find((t) => t.id === toolId)
      this.logger.log(`Auto-linking tool "${tool?.name}" (${toolId}) to assistant ${assistantId}`)
      await this.repository.linkTool(assistantId, toolId)
    }
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }
}
