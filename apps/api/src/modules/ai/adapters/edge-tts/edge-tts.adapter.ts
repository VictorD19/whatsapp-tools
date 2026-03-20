import { Injectable, Logger } from '@nestjs/common'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
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

      const tts = new MsEdgeTTS()
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const { audioStream } = tts.toStream(text)

      const audioBuffer = await Promise.race([
        this.streamToBuffer(audioStream),
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
      this.logger.warn(
        `TTS failed (${this.consecutiveFailures}/${this.MAX_FAILURES}): ${(error as Error).message}`,
      )
      if (this.consecutiveFailures >= this.MAX_FAILURES) {
        this.circuitOpenUntil = Date.now() + this.COOLDOWN_MS
        this.logger.error(
          'TTS circuit breaker opened — disabling for 5 minutes',
        )
      }
      throw error
    }
  }

  private streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  }
}
