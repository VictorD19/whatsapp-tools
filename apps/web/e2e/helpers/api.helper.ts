import * as fs from 'fs'

interface ApiResponse<T = unknown> {
  data: T
}

export class ApiHelper {
  private baseUrl: string
  private token: string

  constructor(token: string, baseUrl = 'http://localhost:3001') {
    this.token = token
    this.baseUrl = baseUrl
  }

  static fromStorageState(path: string): ApiHelper {
    const raw = fs.readFileSync(path, 'utf-8')
    const state = JSON.parse(raw)
    const cookie = state.cookies?.find(
      (c: { name: string; value: string }) => c.name === 'token',
    )
    if (cookie) {
      return new ApiHelper(cookie.value)
    }
    const origin = state.origins?.[0]
    const tokenEntry = origin?.localStorage?.find(
      (entry: { name: string; value: string }) =>
        entry.name === 'token' || entry.name === 'auth-token',
    )
    if (tokenEntry) {
      return new ApiHelper(tokenEntry.value)
    }
    throw new Error(
      `Could not extract auth token from storage state at ${path}`,
    )
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`)
    }
    if (res.status === 204) return undefined as T
    const json = (await res.json()) as ApiResponse<T>
    return json.data ?? (json as unknown as T)
  }

  // Contacts
  async createContact(data: Record<string, unknown>) {
    return this.request('POST', '/contacts', data)
  }

  async deleteContact(id: string) {
    return this.request('DELETE', `/contacts/${id}`)
  }

  // Tags
  async createTag(data: Record<string, unknown>) {
    return this.request('POST', '/tags', data)
  }

  async deleteTag(id: string) {
    return this.request('DELETE', `/tags/${id}`)
  }

  // Users
  async createUser(data: Record<string, unknown>) {
    return this.request('POST', '/users', data)
  }

  async deleteUser(id: string) {
    return this.request('DELETE', `/users/${id}`)
  }

  // Pipelines
  async createPipeline(data: Record<string, unknown>) {
    return this.request('POST', '/pipelines', data)
  }

  async deletePipeline(id: string) {
    return this.request('DELETE', `/pipelines/${id}`)
  }

  // Deals
  async createDeal(data: Record<string, unknown>) {
    return this.request('POST', '/deals', data)
  }

  async deleteDeal(id: string) {
    return this.request('DELETE', `/deals/${id}`)
  }
}
