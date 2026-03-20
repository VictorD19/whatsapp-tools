import { Inject, Injectable } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { TEXT_TO_SPEECH } from '@modules/ai/ai.tokens'
import type { ITextToSpeechProvider } from '@modules/ai/ports/text-to-speech.interface'
import { StorageService } from '@modules/storage/storage.service'
import { AssistantsRepository } from './assistants.repository'
import type { CreateAssistantDto } from './dto/create-assistant.dto'
import type { UpdateAssistantDto } from './dto/update-assistant.dto'
import type { SetConversationAssistantDto } from './dto/set-conversation-assistant.dto'
import type { UpdateAssistantSettingsDto } from './dto/update-assistant-settings.dto'

const PREVIEW_TEXTS: Record<string, string> = {
  'pt-BR': 'Olá! Sou seu assistente virtual. Como posso ajudá-lo hoje?',
  'en-US': 'Hello! I am your virtual assistant. How can I help you today?',
  'es-MX': 'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?',
}

@Injectable()
export class AssistantsService {
  constructor(
    private readonly repository: AssistantsRepository,
    @Inject(TEXT_TO_SPEECH)
    private readonly tts: ITextToSpeechProvider,
    private readonly storage: StorageService,
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

  private maskApiKey(key: string): string {
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }
}
