import { Injectable } from '@nestjs/common'
import type { ITextToSpeechProvider, TTSOptions, TTSResult } from './ports/text-to-speech.interface'
import { EdgeTTSAdapter } from './adapters/edge-tts/edge-tts.adapter'
import { ElevenLabsAdapter } from './adapters/elevenlabs/elevenlabs.adapter'

/**
 * Roteador de TTS: implementa ITextToSpeechProvider e delega para o adapter
 * correto conforme `options.provider` (resolvido por-voz pela camada chamadora).
 * Default: Edge TTS.
 */
@Injectable()
export class TtsRouterService implements ITextToSpeechProvider {
  constructor(
    private readonly edge: EdgeTTSAdapter,
    private readonly elevenLabs: ElevenLabsAdapter,
  ) {}

  synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (options?.provider === 'elevenlabs') {
      return this.elevenLabs.synthesize(text, options)
    }
    return this.edge.synthesize(text, options)
  }
}
