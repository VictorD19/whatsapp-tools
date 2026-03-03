import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class EvolutionHttpClient {
  private readonly logger = new Logger(EvolutionHttpClient.name)
  private readonly baseUrl: string
  private readonly apiKey: string

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

  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, { headers: this.headers })

    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`GET ${path} -> ${res.status}: ${text}`)
      throw new Error(`Evolution API error: GET ${path} ${res.status}`)
    }

    return res.json() as Promise<T>
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`POST ${path} -> ${res.status}: ${text}`)
      throw new Error(`Evolution API error: POST ${path} ${res.status}`)
    }

    return res.json() as Promise<T>
  }

  async delete<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers,
    })

    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`DELETE ${path} -> ${res.status}: ${text}`)
      throw new Error(`Evolution API error: DELETE ${path} ${res.status}`)
    }

    return res.json() as Promise<T>
  }
}
