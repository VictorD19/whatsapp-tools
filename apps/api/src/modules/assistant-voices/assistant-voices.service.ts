import { Inject, Injectable, Logger } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import type { ErrorCode } from '@core/errors/error-codes'
import { TEXT_TO_SPEECH, VOICE_CLONING } from '@modules/ai/ai.tokens'
import type { ITextToSpeechProvider, TTSProvider } from '@modules/ai/ports/text-to-speech.interface'
import {
  VoiceCloningError,
  type IVoiceCloningProvider,
  type VoiceCloningErrorReason,
} from '@modules/ai/ports/voice-cloning.interface'
import { StorageService } from '@modules/storage/storage.service'
import { AssistantVoicesRepository } from './assistant-voices.repository'

const PREVIEW_TEXT = 'Olá! Sou seu assistente virtual. Como posso ajudá-lo hoje?'
const MAX_SAMPLE_BYTES = 10 * 1024 * 1024 // 10 MB

// A ElevenLabs aceita estes formatos direto no /voices/add — não precisamos
// converter ogg/opus (áudio do WhatsApp) para mp3 antes de enviar.
const ALLOWED_SAMPLE_MIMETYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
  'audio/oga',
  'audio/opus',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
])

/** Normaliza "audio/ogg; codecs=opus" -> "audio/ogg" (WhatsApp/browser mandam parâmetros). */
function normalizeMimetype(raw: string): string {
  return (raw ?? '').split(';')[0].trim().toLowerCase()
}

const CLONING_ERROR_MAP: Record<
  VoiceCloningErrorReason,
  { code: ErrorCode; message: string }
> = {
  not_configured: {
    code: 'AI_ELEVENLABS_NOT_CONFIGURED',
    message: 'Clonagem de voz indisponível: ELEVENLABS_API_KEY não configurada',
  },
  limit_reached: {
    code: 'AI_VOICE_LIMIT_REACHED',
    message:
      'Limite de vozes customizadas do plano atingido. Remova uma voz existente para adicionar outra.',
  },
  invalid_sample: {
    code: 'AI_VOICE_SAMPLE_INVALID',
    message: 'A amostra de áudio foi rejeitada. Use um áudio de fala limpo, sem ruído ou música.',
  },
  failed: {
    code: 'AI_VOICE_CLONE_FAILED',
    message: 'Não foi possível clonar a voz. Tente novamente.',
  },
}

export interface VoiceSampleInput {
  buffer: Buffer
  filename: string
  mimetype: string
}

export interface ResolvedVoice {
  provider: TTSProvider
  /** id que o provider entende (shortName do Edge ou voice_id da ElevenLabs) */
  voiceId: string
}

@Injectable()
export class AssistantVoicesService {
  private readonly logger = new Logger(AssistantVoicesService.name)

  constructor(
    private readonly repository: AssistantVoicesRepository,
    @Inject(VOICE_CLONING)
    private readonly voiceCloning: IVoiceCloningProvider,
    @Inject(TEXT_TO_SPEECH)
    private readonly tts: ITextToSpeechProvider,
    private readonly storage: StorageService,
  ) {}

  async list(tenantId: string) {
    const voices = await this.repository.findAll(tenantId)
    return {
      data: voices.map((v) => ({
        id: v.id,
        name: v.name,
        provider: v.provider,
        createdAt: v.createdAt,
      })),
    }
  }

  async create(tenantId: string, name: string, sample: VoiceSampleInput) {
    if (!this.voiceCloning.isConfigured()) {
      throw new AppException(
        'AI_ELEVENLABS_NOT_CONFIGURED',
        'Clonagem de voz indisponível: ELEVENLABS_API_KEY não configurada',
      )
    }

    this.validateSample(sample)

    let externalVoiceId: string
    try {
      const cloned = await this.voiceCloning.cloneVoice(`${tenantId}:${name}`, [
        {
          buffer: sample.buffer,
          filename: sample.filename,
          mimetype: normalizeMimetype(sample.mimetype),
        },
      ])
      externalVoiceId = cloned.externalVoiceId
    } catch (error) {
      const reason: VoiceCloningErrorReason =
        error instanceof VoiceCloningError ? error.reason : 'failed'
      if (reason === 'failed') {
        this.logger.error(`Falha ao clonar voz: ${(error as Error).message}`)
      }
      const mapped = CLONING_ERROR_MAP[reason]
      throw new AppException(mapped.code, mapped.message)
    }

    const voice = await this.repository.create({ tenantId, name, externalVoiceId })

    // Preview é best-effort — não bloqueia a criação da voz.
    try {
      const result = await this.tts.synthesize(PREVIEW_TEXT, {
        voiceId: externalVoiceId,
        provider: 'elevenlabs',
      })
      const previewKey = `voice-previews/${voice.id}.mp3`
      await this.storage.uploadRaw(previewKey, result.audioBuffer, result.mimetype)
      await this.repository.setPreviewKey(voice.id, previewKey)
    } catch (error) {
      this.logger.warn(`Preview da voz ${voice.id} não gerado: ${(error as Error).message}`)
    }

    return {
      data: { id: voice.id, name: voice.name, provider: voice.provider, createdAt: voice.createdAt },
    }
  }

  async remove(tenantId: string, id: string) {
    const voice = await this.repository.findById(tenantId, id)
    if (!voice) {
      throw AppException.notFound('AI_VOICE_NOT_FOUND', 'Voz não encontrada')
    }

    try {
      await this.voiceCloning.deleteVoice(voice.externalVoiceId)
    } catch (error) {
      this.logger.warn(
        `Voz ${id} removida localmente, mas falhou ao remover na ElevenLabs: ${(error as Error).message}`,
      )
    }

    if (voice.previewKey) {
      try {
        await this.storage.delete(voice.previewKey)
      } catch {
        // preview pode nem existir — ignora
      }
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  /**
   * Resolve um `voiceId` (guardado em Assistant.voiceId) para o provider + id concretos.
   * Se o valor casar com uma voz customizada do tenant → ElevenLabs.
   * Caso contrário assume voz built-in do Edge TTS.
   *
   * Nunca aceita `externalVoiceId` cru: a resolução é sempre escopada por tenant.
   */
  async resolveForTts(
    tenantId: string,
    voiceId: string | null | undefined,
  ): Promise<ResolvedVoice> {
    if (voiceId && this.looksLikeCustomVoiceId(voiceId)) {
      const voice = await this.repository.findById(tenantId, voiceId)
      if (voice) {
        return { provider: 'elevenlabs', voiceId: voice.externalVoiceId }
      }
    }
    return { provider: 'edge', voiceId: voiceId ?? 'pt-BR-FranciscaNeural' }
  }

  /** cuid() do Prisma não tem hífen; vozes built-in do Edge têm (ex: pt-BR-FranciscaNeural). */
  private looksLikeCustomVoiceId(voiceId: string): boolean {
    return !voiceId.includes('-')
  }

  private validateSample(sample: VoiceSampleInput) {
    if (!sample?.buffer?.length) {
      throw new AppException('AI_VOICE_SAMPLE_INVALID', 'Nenhum arquivo de áudio recebido')
    }
    if (sample.buffer.length > MAX_SAMPLE_BYTES) {
      throw new AppException('AI_VOICE_SAMPLE_INVALID', 'A amostra de áudio excede o limite de 10 MB')
    }
    const mimetype = normalizeMimetype(sample.mimetype)
    if (!ALLOWED_SAMPLE_MIMETYPES.has(mimetype)) {
      throw new AppException(
        'AI_VOICE_SAMPLE_INVALID',
        'Formato de áudio não suportado. Envie mp3, wav, m4a, ogg ou webm.',
      )
    }
  }
}
