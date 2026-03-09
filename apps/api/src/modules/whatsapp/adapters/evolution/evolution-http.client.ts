import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export class EvolutionApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message)
    this.name = 'EvolutionApiError'
  }

  /** Retorna true se a resposta indica que o número não existe no WhatsApp */
  isPhoneNotOnWhatsApp(): boolean {
    try {
      const parsed = JSON.parse(this.responseBody)
      const messages = parsed?.response?.message
      if (Array.isArray(messages)) {
        return messages.some((m: { exists?: boolean }) => m.exists === false)
      }
    } catch {
      // não é JSON
    }
    return false
  }
}

@Injectable()
export class EvolutionHttpClient {
  private readonly logger = new Logger(EvolutionHttpClient.name)
  private readonly baseUrl: string
  private readonly apiKey: string

  // Default 60s — covers slow responses for findChats / findContacts with large accounts.
  // Individual callers can override via the timeoutMs parameter.
  private readonly defaultTimeoutMs = 60_000

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('EVOLUTION_API_URL', 'http://localhost:8080')
    this.apiKey = this.config.get<string>('EVOLUTION_API_KEY', '')
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.apiKey,
    }
  }

  private createAbortSignal(timeoutMs: number): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    return { signal: controller.signal, clear: () => clearTimeout(timer) }
  }

  async get<T>(path: string, timeoutMs = this.defaultTimeoutMs): Promise<T> {
    const { signal, clear } = this.createAbortSignal(timeoutMs)
    const url = `${this.baseUrl}${path}`
    try {
      const res = await fetch(url, { headers: this.headers, signal })

      if (!res.ok) {
        const text = await res.text()
        this.logger.error(`GET ${path} -> ${res.status}: ${text}`)
        throw new Error(`Evolution API error: GET ${path} ${res.status}`)
      }

      return res.json() as Promise<T>
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.logger.error(`GET ${path} -> timed out after ${timeoutMs}ms`)
        throw new Error(`Evolution API timeout: GET ${path}`)
      }
      throw err
    } finally {
      clear()
    }
  }

  async post<T>(path: string, body?: unknown, timeoutMs = this.defaultTimeoutMs): Promise<T> {
    const { signal, clear } = this.createAbortSignal(timeoutMs)
    const url = `${this.baseUrl}${path}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      })

      if (!res.ok) {
        const text = await res.text()
        this.logger.error(`POST ${path} -> ${res.status}: ${text}`)
        const error = new EvolutionApiError(`Evolution API error: POST ${path} ${res.status}`, res.status, text)
        throw error
      }

      return res.json() as Promise<T>
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.logger.error(`POST ${path} -> timed out after ${timeoutMs}ms`)
        throw new EvolutionApiError(`Evolution API timeout: POST ${path}`, 408, '')
      }
      throw err
    } finally {
      clear()
    }
  }

  async delete<T = void>(path: string, timeoutMs = this.defaultTimeoutMs): Promise<T> {
    const { signal, clear } = this.createAbortSignal(timeoutMs)
    const url = `${this.baseUrl}${path}`
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.headers,
        signal,
      })

      if (!res.ok) {
        const text = await res.text()
        this.logger.error(`DELETE ${path} -> ${res.status}: ${text}`)
        throw new EvolutionApiError(`Evolution API error: DELETE ${path} ${res.status}`, res.status, text)
      }

      const contentLength = res.headers.get('content-length')
      const contentType = res.headers.get('content-type') ?? ''
      if (res.status === 204 || contentLength === '0' || !contentType.includes('application/json')) {
        return undefined as T
      }

      return res.json() as Promise<T>
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.logger.error(`DELETE ${path} -> timed out after ${timeoutMs}ms`)
        throw new EvolutionApiError(`Evolution API timeout: DELETE ${path}`, 408, '')
      }
      throw err
    } finally {
      clear()
    }
  }
}
