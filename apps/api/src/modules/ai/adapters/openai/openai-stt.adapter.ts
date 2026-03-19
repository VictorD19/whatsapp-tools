import { Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import type { ISpeechToTextProvider, STTOptions, STTResult } from '../../ports/speech-to-text.interface'

const DEFAULT_MODEL = 'whisper-1'

@Injectable()
export class OpenAISTTAdapter implements ISpeechToTextProvider {
  private readonly logger = new Logger(OpenAISTTAdapter.name)
  private readonly client: OpenAI | null

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured — audio transcription disabled')
      this.client = null
    } else {
      this.client = new OpenAI({ apiKey })
    }
  }

  async transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<STTResult> {
    if (!this.client) {
      throw new Error('OPENAI_API_KEY not configured — cannot transcribe audio')
    }

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' })
    const file = new File([blob], 'audio.ogg', { type: 'audio/ogg' })

    const response = await this.client.audio.transcriptions.create({
      file,
      model: options?.model ?? DEFAULT_MODEL,
      language: options?.language ?? 'pt',
      response_format: 'verbose_json',
    })

    return {
      text: response.text?.trim() ?? '',
      language: (response as any).language ?? options?.language ?? 'pt',
      duration: (response as any).duration ?? undefined,
    }
  }
}
