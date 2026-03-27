import ky, { type KyInstance } from 'ky'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

function clearSession() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

// Flag para evitar múltiplos refreshes simultâneos
let isRefreshing = false
let refreshQueue: ((token: string) => void)[] = []

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  if (isRefreshing) {
    // Esperar o refresh em andamento terminar
    return new Promise((resolve) => {
      refreshQueue.push(resolve)
    })
  }

  isRefreshing = true
  try {
    const res = await fetch(`${API_URL}auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      clearSession()
      return null
    }

    const body = await res.json() as { data: { accessToken: string; refreshToken: string } }
    const newAccessToken = body.data.accessToken
    const newRefreshToken = body.data.refreshToken

    localStorage.setItem('auth_token', newAccessToken)
    if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken)

    // Notificar requisições que estavam esperando
    refreshQueue.forEach((cb) => cb(newAccessToken))
    refreshQueue = []

    return newAccessToken
  } catch {
    clearSession()
    return null
  } finally {
    isRefreshing = false
  }
}

export const api: KyInstance = ky.create({
  prefixUrl: API_URL,
  timeout: 30_000,
  retry: {
    limit: 2,
    statusCodes: [408, 429, 502, 503, 504],
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
    beforeError: [
      async (error) => {
        try {
          const body = await error.response.json() as { error?: { message?: string; code?: string } }
          if (body?.error?.message) {
            error.message = body.error.message
          }
          if (body?.error?.code) {
            (error as Error & { errorCode?: string }).errorCode = body.error.code
          }
        } catch {
          // response is not JSON or already consumed — keep original message
        }
        return error
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          const isAuthEndpoint = _request.url.includes('auth/login') || _request.url.includes('auth/refresh')
          if (!isAuthEndpoint && typeof window !== 'undefined') {
            const newToken = await tryRefresh()
            if (!newToken) return response

            // Repetir a requisição original com o novo token
            const retryRequest = new Request(_request)
            retryRequest.headers.set('Authorization', `Bearer ${newToken}`)
            return fetch(retryRequest)
          }
        }
        return response
      },
    ],
  },
})

export function getApiErrorCode(err: unknown): string | null {
  return (err as Error & { errorCode?: string })?.errorCode ?? null
}

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

export async function apiUploadPut<T>(path: string, formData: FormData): Promise<T> {
  return api.put(path, { body: formData }).json<T>()
}
