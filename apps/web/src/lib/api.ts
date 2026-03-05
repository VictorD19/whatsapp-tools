import ky, { type KyInstance } from 'ky'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export const api: KyInstance = ky.create({
  prefixUrl: API_URL,
  timeout: 30_000,
  retry: {
    limit: 2,
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken()
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            window.location.href = '/login'
          }
        }
        return response
      },
    ],
  },
})

// Typed helpers
export async function apiGet<T>(path: string): Promise<T> {
  return api.get(path).json<T>()
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  return api.post(path, { json: data }).json<T>()
}

export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  return api.patch(path, { json: data }).json<T>()
}

export async function apiDelete<T>(path: string): Promise<T> {
  return api.delete(path).json<T>()
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return api.post(path, { body: formData }).json<T>()
}
