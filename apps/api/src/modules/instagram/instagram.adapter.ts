import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { InstagramConfig } from './instagram.config'
import { IncomingDirect, incomingDirects } from './instagram.policy'

@Injectable()
export class InstagramAdapter {
  constructor(private readonly config: InstagramConfig) {}
  authUrl(state: string): string {
    this.config.assertMeta()
    const url = new URL('https://www.facebook.com/dialog/oauth')
    url.search = new URLSearchParams({ client_id: this.config.get('INSTAGRAM_APP_ID'),
      redirect_uri: this.config.get('INSTAGRAM_REDIRECT_URI'), response_type: 'code',
      config_id: this.config.get('INSTAGRAM_CONFIG_ID'), display: 'popup', override_default_response_type: 'true', prompt: 'login', state }).toString()
    return url.toString()
  }
  private async request(url: string, init: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000), redirect: 'error' })
      if (!response.ok) throw new Error('provider_error')
      const body = await response.json() as any
      if (body.error) throw new Error('provider_error')
      return body
    } catch { throw new ServiceUnavailableException('A Meta não confirmou a operação. Verifique a conexão antes de tentar novamente.') }
  }
  async exchange(code: string): Promise<{ instagramId: string; username: string; clientBusinessId: string; token: string; expiresAt: Date | null }> {
    this.config.assertMeta()
    const base = `https://graph.facebook.com/${this.config.get('INSTAGRAM_API_VERSION')}`
    const query = new URLSearchParams({ client_id: this.config.get('INSTAGRAM_APP_ID'), client_secret: this.config.get('INSTAGRAM_APP_SECRET'),
      redirect_uri: this.config.get('INSTAGRAM_REDIRECT_URI'), code })
    const result = await this.request(`${base}/oauth/access_token?${query}`, { method: 'GET' })
    if (typeof result.access_token !== 'string' || !result.access_token ||
        (result.expires_in != null && (!Number.isFinite(result.expires_in) || result.expires_in < 0))) throw new ServiceUnavailableException('Token Instagram inválido')
    const headers = { Authorization: `Bearer ${result.access_token}` }
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
    return { instagramId, username: me.username, clientBusinessId, token: result.access_token,
      expiresAt: result.expires_in > 0 ? new Date(Date.now() + result.expires_in * 1000) : null }
  }
  async sendText(instagramId: string, participantId: string, token: string | null, text: string): Promise<string> {
    if (this.config.mode === 'simulated') return 'simulated-' + randomUUID()
    this.config.assertMeta()
    if (this.config.get('INSTAGRAM_SEND_ENABLED') !== 'true' || !token) throw new ServiceUnavailableException('Envio real desabilitado no piloto')
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
