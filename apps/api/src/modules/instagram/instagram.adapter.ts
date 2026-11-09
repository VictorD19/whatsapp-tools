import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { InstagramConfig } from './instagram.config'

@Injectable()
export class InstagramAdapter {
  constructor(private readonly config: InstagramConfig) {}
  authUrl(state: string): string {
    this.config.assertMeta()
    const url = new URL('https://www.instagram.com/oauth/authorize')
    url.search = new URLSearchParams({ client_id: this.config.get('INSTAGRAM_APP_ID'),
      redirect_uri: this.config.get('INSTAGRAM_REDIRECT_URI'), response_type: 'code',
      scope: 'instagram_business_basic,instagram_business_manage_messages', state }).toString()
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
  async exchange(code: string): Promise<{ instagramId: string; username: string; token: string; expiresAt: Date }> {
    this.config.assertMeta()
    const short = await this.request('https://api.instagram.com/oauth/access_token', { method: 'POST',
      body: new URLSearchParams({ client_id: this.config.get('INSTAGRAM_APP_ID'), client_secret: this.config.get('INSTAGRAM_APP_SECRET'),
        grant_type: 'authorization_code', redirect_uri: this.config.get('INSTAGRAM_REDIRECT_URI'), code }) })
    if (!short.access_token) throw new ServiceUnavailableException('Autorização Instagram incompleta')
    const query = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: this.config.get('INSTAGRAM_APP_SECRET'), access_token: short.access_token })
    const long = await this.request('https://graph.instagram.com/access_token?' + query, { method: 'GET' })
    if (!long.access_token || !Number.isFinite(long.expires_in) || long.expires_in <= 0) throw new ServiceUnavailableException('Token Instagram inválido')
    const headers = { Authorization: `Bearer ${long.access_token}` }
    const me = await this.request(`https://graph.instagram.com/${this.config.get('INSTAGRAM_API_VERSION')}/me?fields=user_id,username`, { headers })
    const instagramId = String(me.user_id || me.id || '')
    if (!/^\d+$/.test(instagramId) || typeof me.username !== 'string') throw new ServiceUnavailableException('Conta Instagram inválida')
    await this.request(`https://graph.instagram.com/${this.config.get('INSTAGRAM_API_VERSION')}/${instagramId}/subscribed_apps`, {
      method: 'POST', headers, body: new URLSearchParams({ subscribed_fields: 'messages' }),
    })
    return { instagramId, username: me.username, token: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000) }
  }
  async sendText(instagramId: string, participantId: string, token: string | null, text: string): Promise<string> {
    if (this.config.mode === 'simulated') return 'simulated-' + randomUUID()
    this.config.assertMeta()
    if (this.config.get('INSTAGRAM_SEND_ENABLED') !== 'true' || !token) throw new ServiceUnavailableException('Envio real desabilitado no piloto')
    const result = await this.request(`https://graph.instagram.com/${this.config.get('INSTAGRAM_API_VERSION')}/${instagramId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: participantId }, message: { text } }),
    })
    if (typeof result.message_id !== 'string') throw new ServiceUnavailableException('Envio sem confirmação da Meta')
    return result.message_id
  }
}
