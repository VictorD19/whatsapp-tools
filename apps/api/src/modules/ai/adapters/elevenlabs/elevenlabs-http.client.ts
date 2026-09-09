import { Injectable, Logger } from '@nestjs/common'
import type { VoiceSample } from '../../ports/voice-cloning.interface'

const BASE_URL = 'https://api.elevenlabs.io/v1'

export class ElevenLabsApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    /** ElevenLabs machine-readable status, e.g. "voice_limit_reached" */
    public readonly detailStatus?: string,
  ) {
    super(message)
    this.name = 'ElevenLabsApiError'
  }
}

interface AddVoiceResponse {
  voice_id: string
}

/**
 * HTTP client isolado para a ElevenLabs API.
 * Nenhum tipo específico da ElevenLabs vaza para fora deste arquivo/adapter.
 */
@Injectable()
export class ElevenLabsHttpClient {
  private readonly logger = new Logger(ElevenLabsHttpClient.name)
  private readonly defaultTimeoutMs = 30_000

  private get apiKey(): string {
    const key = process.env.ELEVENLABS_API_KEY
    if (!key) {
      throw new ElevenLabsApiError('ELEVENLABS_API_KEY não configurada', 0, 'not_configured')
    }
    return key
  }

  isConfigured(): boolean {
    return !!process.env.ELEVENLABS_API_KEY
  }

  private createAbortSignal(timeoutMs: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    return { signal: controller.signal, clear: () => clearTimeout(timer) }
  }

  private async parseError(res: Response, path: string): Promise<ElevenLabsApiError> {
    const text = await res.text()
    let detailStatus: string | undefined
    let message = text
    try {
      const parsed = JSON.parse(text)
      const detail = parsed?.detail
      if (typeof detail === 'string') {
        message = detail
      } else if (detail && typeof detail === 'object') {
        detailStatus = detail.status
        message = detail.message ?? text
      }
    } catch {
      // corpo não é JSON — mantém texto cru
    }
    this.logger.warn(`${path} -> ${res.status}: ${message}`)
    return new ElevenLabsApiError(
      `ElevenLabs API error: ${path} ${res.status} — ${message}`,
      res.status,
      detailStatus,
    )
  }

  /** POST /text-to-speech/{voiceId} — retorna o áudio (mp3) como Buffer. */
  async textToSpeech(voiceId: string, text: string, timeoutMs = this.defaultTimeoutMs): Promise<Buffer> {
    const path = `/text-to-speech/${voiceId}`
    const { signal, clear } = this.createAbortSignal(timeoutMs)
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
        signal,
      })

      if (!res.ok) {
        throw await this.parseError(res, `POST ${path}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new ElevenLabsApiError(`ElevenLabs API timeout: POST ${path}`, 408)
      }
      throw err
    } finally {
      clear()
    }
  }

  /** POST /voices/add — clona uma voz a partir de amostras de áudio. */
  async addVoice(name: string, samples: VoiceSample[], timeoutMs = 60_000): Promise<string> {
    const path = '/voices/add'
    const { signal, clear } = this.createAbortSignal(timeoutMs)
    try {
      const form = new FormData()
      form.append('name', name)
      for (const sample of samples) {
        const blob = new Blob([new Uint8Array(sample.buffer)], { type: sample.mimetype })
        form.append('files', blob, sample.filename)
      }

      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'xi-api-key': this.apiKey },
        body: form,
        signal,
      })

      if (!res.ok) {
        throw await this.parseError(res, `POST ${path}`)
      }

      const json = (await res.json()) as AddVoiceResponse
      if (!json?.voice_id) {
        throw new ElevenLabsApiError(`ElevenLabs API error: POST ${path} — resposta sem voice_id`, 502)
      }
      return json.voice_id
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new ElevenLabsApiError(`ElevenLabs API timeout: POST ${path}`, 408)
      }
      throw err
    } finally {
      clear()
    }
  }

  /** DELETE /voices/{voiceId} */
  async deleteVoice(voiceId: string, timeoutMs = this.defaultTimeoutMs): Promise<void> {
    const path = `/voices/${voiceId}`
    const { signal, clear } = this.createAbortSignal(timeoutMs)
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': this.apiKey },
        signal,
      })

      // 404 = voz já não existe na ElevenLabs; tratamos como sucesso (idempotente)
      if (!res.ok && res.status !== 404) {
        throw await this.parseError(res, `DELETE ${path}`)
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new ElevenLabsApiError(`ElevenLabs API timeout: DELETE ${path}`, 408)
      }
      throw err
    } finally {
      clear()
    }
  }
}
