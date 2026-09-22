import { Injectable, Logger } from '@nestjs/common'
import type { ITextToSpeechProvider, TTSOptions, TTSResult } from '../../ports/text-to-speech.interface'
import {
  VoiceCloningError,
  type ClonedVoice,
  type IVoiceCloningProvider,
  type VoiceSample,
} from '../../ports/voice-cloning.interface'
import { ElevenLabsApiError, ElevenLabsHttpClient } from './elevenlabs-http.client'

/**
 * Adapter da ElevenLabs — cobre TTS (vozes clonadas) e voice cloning.
 * O restante do sistema nunca importa esta classe diretamente: usa os tokens
 * TEXT_TO_SPEECH (via TtsRouterService) e VOICE_CLONING.
 */
@Injectable()
export class ElevenLabsAdapter implements ITextToSpeechProvider, IVoiceCloningProvider {
  private readonly logger = new Logger(ElevenLabsAdapter.name)

  private consecutiveFailures = 0
  private circuitOpenUntil = 0
  private readonly MAX_FAILURES = 5
  private readonly COOLDOWN_MS = 5 * 60 * 1000 // 5 minutos

  constructor(private readonly http: ElevenLabsHttpClient) {}

  isConfigured(): boolean {
    return this.http.isConfigured()
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (this.consecutiveFailures >= this.MAX_FAILURES && Date.now() < this.circuitOpenUntil) {
      throw new Error('ElevenLabs TTS circuit breaker open — too many consecutive failures')
    }

    const voiceId = options?.voiceId
    if (!voiceId) {
      throw new Error('ElevenLabs synthesize requer voiceId')
    }

    try {
      const audioBuffer = await this.http.textToSpeech(voiceId, text)
      this.consecutiveFailures = 0
      return { audioBuffer, mimetype: 'audio/mpeg' }
    } catch (error) {
      this.registerFailure(error as Error)
      throw error
    }
  }

  async cloneVoice(name: string, samples: VoiceSample[]): Promise<ClonedVoice> {
    try {
      const externalVoiceId = await this.http.addVoice(name, samples)
      return { externalVoiceId }
    } catch (error) {
      throw this.toCloningError(error)
    }
  }

  async deleteVoice(externalVoiceId: string): Promise<void> {
    await this.http.deleteVoice(externalVoiceId)
  }

  private toCloningError(error: unknown): VoiceCloningError {
    if (error instanceof VoiceCloningError) return error
    if (error instanceof ElevenLabsApiError) {
      if (error.detailStatus === 'not_configured') {
        return new VoiceCloningError(error.message, 'not_configured')
      }
      if (
        error.detailStatus === 'voice_limit_reached' ||
        error.detailStatus === 'can_not_use_instant_voice_cloning'
      ) {
        return new VoiceCloningError(error.message, 'limit_reached')
      }
      if (
        error.detailStatus === 'invalid_content' ||
        error.detailStatus === 'voice_add_edit_failed' ||
        error.httpStatus === 422
      ) {
        return new VoiceCloningError(error.message, 'invalid_sample')
      }
    }
    return new VoiceCloningError((error as Error)?.message ?? 'clone failed', 'failed')
  }

  private registerFailure(error: Error) {
    this.consecutiveFailures++
    this.logger.warn(
      `ElevenLabs failed (${this.consecutiveFailures}/${this.MAX_FAILURES}): ${error.message}`,
    )
    if (this.consecutiveFailures >= this.MAX_FAILURES) {
      this.circuitOpenUntil = Date.now() + this.COOLDOWN_MS
      this.logger.error('ElevenLabs circuit breaker opened — disabling for 5 minutes')
    }
  }
}
