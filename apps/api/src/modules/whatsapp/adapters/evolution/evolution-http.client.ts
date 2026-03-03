import { Injectable } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'

@Injectable()
export class EvolutionHttpClient {
  private readonly http: AxiosInstance

  constructor() {
    this.http = axios.create({
      baseURL: process.env.EVOLUTION_API_URL ?? 'http://localhost:8080',
      headers: {
        apikey: process.env.EVOLUTION_API_KEY ?? '',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    })
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.http.get<T>(path)
    return response.data
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.http.post<T>(path, body)
    return response.data
  }

  async delete<T>(path: string): Promise<T> {
    const response = await this.http.delete<T>(path)
    return response.data
  }
}
