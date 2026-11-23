import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { InstagramConfig } from './instagram.config'
import { IncomingDirect, incomingDirects } from './instagram.policy'

export type InstagramToken = { token: string; expiresAt: Date | null }
export type InstagramConnection = InstagramToken & { instagramId: string; username: string; clientBusinessId: string }
// Only normalized diagnostics leave the transport. Never expose a provider body or URL.
export class InstagramTransportError extends ServiceUnavailableException {
  constructor(readonly retryable: boolean, readonly retryAfterSeconds = 300) {
    super(retryable ? 'A Meta está temporariamente indisponível. A autorização será retomada sem novo login.' : 'A Meta não confirmou a operação. Verifique a conexão antes de tentar novamente.')
  }
}

@Injectable()
export class InstagramAdapter {
  constructor(private readonly config: InstagramConfig) {}
  authUrl(state: string, useFacebookSession = false): string {
    this.config.assertMeta()
    const configId = (useFacebookSession && this.config.get('INSTAGRAM_FACEBOOK_CONFIG_ID')) || this.config.get('INSTAGRAM_CONFIG_ID')
    if (!/^\d+$/.test(configId)) throw new ServiceUnavailableException('Configuração de login do Facebook inválida no piloto')
    const url = new URL('https://www.facebook.com/dialog/oauth')
    url.search = new URLSearchParams({ client_id: this.config.get('INSTAGRAM_APP_ID'),
      redirect_uri: this.config.get('INSTAGRAM_REDIRECT_URI'), response_type: 'code',
      config_id: configId, display: 'popup', override_default_response_type: 'true', state }).toString()
    if (!useFacebookSession) url.searchParams.set('prompt', 'login')
    return url.toString()
  }
  private async request(url: string, init: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000), redirect: 'error' })
      const body = await response.json() as any
      if (!response.ok || body.error) {
        const retryable = response.status === 429 || response.status >= 500 || [4, 17, 32, 613, 80004].includes(body.error?.code)
        const retryAfter = Number(response.headers?.get('retry-after'))
        throw new InstagramTransportError(retryable, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(3600, Math.max(60, retryAfter)) : 300)
      }
      return body
    } catch (error) {
      if (error instanceof InstagramTransportError) throw error
      throw new InstagramTransportError(true)
    }
  }
  async exchangeToken(code: string): Promise<InstagramToken> {
    this.config.assertMeta()
    const base = `https://graph.facebook.com/${this.config.get('INSTAGRAM_API_VERSION')}`
    const query = new URLSearchParams({ client_id: this.config.get('INSTAGRAM_APP_ID'), client_secret: this.config.get('INSTAGRAM_APP_SECRET'),
      redirect_uri: this.config.get('INSTAGRAM_REDIRECT_URI'), code })
    const result = await this.request(`${base}/oauth/access_token?${query}`, { method: 'GET' })
    if (typeof result.access_token !== 'string' || !result.access_token ||
        (result.expires_in != null && (!Number.isFinite(result.expires_in) || result.expires_in < 0))) throw new ServiceUnavailableException('Token Instagram inválido')
    return { token: result.access_token, expiresAt: result.expires_in > 0 ? new Date(Date.now() + result.expires_in * 1000) : null }
  }
  async completeConnection(authorization: InstagramToken): Promise<InstagramConnection> {
    this.config.assertMeta()
    const base = `https://graph.facebook.com/${this.config.get('INSTAGRAM_API_VERSION')}`
    const headers = { Authorization: `Bearer ${authorization.token}` }
    // With Unified Login, /me identifies the integration system user, not Instagram.
    const business = await this.request(`${base}/me?fields=client_business_id`, { headers })
    const assigned = await this.request(`${base}/me/assigned_instagram_accounts?fields=id,username&limit=2`, { headers })
    if (!Array.isArray(assigned.data) || assigned.data.length !== 1 || assigned.paging?.next) {
      throw new ServiceUnavailableException('Neste piloto, autorize exatamente uma conta profissional do Instagram e tente novamente')
    }
    const me = assigned.data[0]
    const instagramId = String(me.id || ''), clientBusinessId = String(business.client_business_id || '')
    if (!/^\d+$/.test(instagramId) || !/^\d+$/.test(clientBusinessId) || typeof me.username !== 'string') throw new ServiceUnavailableException('Conta Instagram inválida')
    await this.request(`${base}/${instagramId}/subscribed_apps`, {
      method: 'POST', headers, body: new URLSearchParams({ subscribed_fields: 'messages,standby' }),
    })
    return { instagramId, username: me.username, clientBusinessId, ...authorization }
  }
  async exchange(code: string): Promise<InstagramConnection> {
    return this.completeConnection(await this.exchangeToken(code))
  }
  async sendText(instagramId: string, participantId: string, token: string | null, text: string): Promise<string> {
    if (this.config.mode === 'simulated') return 'simulated-' + randomUUID()
    this.config.assertMeta()
    if (!this.config.transportTargetAllowed(instagramId, participantId) || !token) throw new ServiceUnavailableException('Envio real desabilitado para este destinatário no piloto')
    const result = await this.request(`https://graph.facebook.com/${this.config.get('INSTAGRAM_API_VERSION')}/${instagramId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: participantId }, message: { text } }),
    })
    if (typeof result.message_id !== 'string') throw new ServiceUnavailableException('Envio sem confirmação da Meta')
    return result.message_id
  }
  async readRecentIncoming(instagramId: string, token: string, since: number): Promise<IncomingDirect[]> {
    this.config.assertMeta()
    const base = `https://graph.facebook.com/${this.config.get('INSTAGRAM_API_VERSION')}`
    const headers = { Authorization: `Bearer ${token}` }
    const threads = await this.request(`${base}/${encodeURIComponent(instagramId)}/conversations?platform=instagram&fields=id,updated_time&limit=3`, { method: 'GET', headers })
    if (!Array.isArray(threads.data)) throw new ServiceUnavailableException('Resposta de conversas inválida da Meta')
    const events: IncomingDirect[] = []
    for (const thread of threads.data.slice(0, 3)) {
      if (typeof thread?.id !== 'string' || !thread.id || thread.id.length > 1024) continue
      const updated = Date.parse(thread.updated_time)
      if (Number.isFinite(updated) && updated < since) continue
      const result = await this.request(`${base}/${encodeURIComponent(thread.id)}/messages?fields=id,message,from,to,created_time&limit=20`, { method: 'GET', headers })
      if (!Array.isArray(result.data)) throw new ServiceUnavailableException('Resposta de mensagens inválida da Meta')
      const messaging = result.data.slice(0, 20).filter((m: any) =>
        Array.isArray(m?.to?.data) && m.to.data.some((p: any) => String(p?.id) === instagramId))
        .map((m: any) => ({ sender: m.from, recipient: { id: instagramId }, timestamp: Date.parse(m.created_time),
          message: { mid: m.id, text: m.message } }))
      events.push(...incomingDirects({ object: 'instagram', entry: [{ id: instagramId, messaging }] }, Date.now())
        .filter(event => event.at.getTime() >= since))
    }
    return events
  }
}
