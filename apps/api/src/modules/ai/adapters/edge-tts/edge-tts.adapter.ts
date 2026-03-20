import { Injectable, Logger } from '@nestjs/common'
import type { ITextToSpeechProvider, TTSOptions, TTSResult } from '../../ports/text-to-speech.interface'

const DEFAULT_VOICE = 'pt-BR-FranciscaNeural'
const TIMEOUT_MS = 10_000

// edge-tts is ESM-only — use native import() to avoid TS compiling it to require()
let _tts: ((text: string, opts: { voice: string }) => Promise<Buffer>) | null = null
async function getEdgeTTS() {
  if (!_tts) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = await (new Function('return import("edge-tts")')() as Promise<{ tts: typeof _tts }>)
    _tts = mod.tts
  }
  return _tts!
}

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
      const tts = await getEdgeTTS()
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
