import { Injectable, Logger } from '@nestjs/common'
import { tts } from 'edge-tts'
import type { ITextToSpeechProvider, TTSOptions, TTSResult } from '../../ports/text-to-speech.interface'

const DEFAULT_VOICE = 'pt-BR-FranciscaNeural'
const TIMEOUT_MS = 10_000

@Injectable()
export class EdgeTTSAdapter implements ITextToSpeechProvider {
  private readonly logger = new Logger(EdgeTTSAdapter.name)

  private consecutiveFailures = 0
  private circuitOpenUntil = 0
  private readonly MAX_FAILURES = 5
  private readonly COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (
      this.consecutiveFailures >= this.MAX_FAILURES &&
      Date.now() < this.circuitOpenUntil
    ) {
      throw new Error('TTS circuit breaker open — too many consecutive failures')
    }

    try {
      const voiceId = options?.voiceId ?? DEFAULT_VOICE
      const audioBuffer = await Promise.race([
        tts(text, { voice: voiceId }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TTS timeout after 10s')), TIMEOUT_MS),
        ),
      ])

      this.consecutiveFailures = 0

      return {
        audioBuffer,
        mimetype: 'audio/mpeg',
      }
    } catch (error) {
      this.consecutiveFailures++
      if (this.consecutiveFailures >= this.MAX_FAILURES) {
        this.circuitOpenUntil = Date.now() + this.COOLDOWN_MS
        this.logger.error(
          'TTS circuit breaker opened — disabling for 5 minutes',
          'EdgeTTSAdapter',
        )
      }
      throw error
    }
  }
}
