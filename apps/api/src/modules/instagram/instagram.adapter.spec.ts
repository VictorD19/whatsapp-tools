import { ConfigService } from '@nestjs/config'
import { InstagramConfig } from './instagram.config'
import { InstagramAdapter } from './instagram.adapter'

describe('Instagram Meta transport', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })
  const values = () => ({ NODE_ENV: 'test', INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_APP_SECRET: 'secret',
    INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback', INSTAGRAM_SEND_ENABLED: 'true' })
  it('synchronizes only recent inbound text addressed to the authorized account', async () => {
    const at = Date.now() - 1000, since = at - 60000
    const incoming = { id: 'provider-id', message: 'real provider text', from: { id: '456' }, to: { data: [{ id: '123' }] }, created_time: new Date(at).toISOString() }
    const bodies = [{ data: [{ id: 'thread/one', updated_time: new Date(at).toISOString() }, { id: 'old-thread', updated_time: new Date(since - 1000).toISOString() }] },
      { data: [incoming, { ...incoming, id: 'outgoing', from: { id: '123' }, to: { data: [{ id: '456' }] } },
        { ...incoming, id: 'foreign', to: { data: [{ id: '999' }] } }, { ...incoming, id: 'history', created_time: new Date(since - 1).toISOString() },
        { ...incoming, id: 'attachment', message: undefined }] }]
    const fetch = jest.fn(async () => ({ ok: true, json: async () => bodies.shift() }))
    global.fetch = fetch as any
    const adapter = new InstagramAdapter(new InstagramConfig(new ConfigService(values())))
    expect(await adapter.readRecentIncoming('123', 'private-token', since)).toEqual([
      { accountId: '123', participantId: '456', messageId: 'provider-id', text: 'real provider text', at: new Date(at) },
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
    for (const [url, options] of fetch.mock.calls as any) {
      expect(new URL(url).hostname).toBe('graph.facebook.com')
      expect(url).not.toContain('private-token')
      expect(options).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer private-token' } })
    }
    expect((fetch.mock.calls as any)[1][0]).toContain('/thread%2Fone/messages?')
  })
  it('bounds provider reads even when Meta returns more threads than requested', async () => {
    const fetch = jest.fn(async (url: string) => ({ ok: true, json: async () => url.includes('/conversations?')
      ? { data: Array.from({ length: 10 }, (_, i) => ({ id: 'thread-' + i })) } : { data: [] } }))
    global.fetch = fetch as any
    await new InstagramAdapter(new InstagramConfig(new ConfigService(values()))).readRecentIncoming('123', 'token', 0)
    expect(fetch).toHaveBeenCalledTimes(4)
  })
  it('sends only to the fixed Instagram host using a bearer header', async () => {
    const fetch = jest.fn(async () => ({ ok: true, json: async () => ({ message_id: 'mid' }) }))
    global.fetch = fetch as any
    const adapter = new InstagramAdapter(new InstagramConfig(new ConfigService(values())))
    expect(await adapter.sendText('123', '456', 'private-token', 'Hello')).toBe('mid')
    expect(fetch).toHaveBeenCalledWith('https://graph.facebook.com/v99.0/123/messages', expect.objectContaining({
      method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: '456' }, message: { text: 'Hello' } }),
    }))
  })
  it('never calls Meta when real sending is disabled or mode is simulated', async () => {
    global.fetch = jest.fn() as any
    const disabled = { ...values(), INSTAGRAM_SEND_ENABLED: 'false' }
    await expect(new InstagramAdapter(new InstagramConfig(new ConfigService(disabled))).sendText('123', '456', 'token', 'text')).rejects.toThrow()
    const result = await new InstagramAdapter(new InstagramConfig(new ConfigService({ ...values(), INSTAGRAM_MODE: 'simulated' }))).sendText('123', '456', null, 'text')
    expect(result.startsWith('simulated-')).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('does not include provider errors or credentials in application exceptions', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ error: 'private-token' }) })) as any
    const adapter = new InstagramAdapter(new InstagramConfig(new ConfigService(values())))
    await expect(adapter.sendText('123', '456', 'private-token', 'text')).rejects.toThrow('A Meta não confirmou')
  })
  it('uses Unified Login config_id and opaque state instead of legacy Instagram scopes', () => {
    const url = new URL(new InstagramAdapter(new InstagramConfig(new ConfigService(values()))).authUrl('opaque-state'))
    expect(url.origin).toBe('https://www.facebook.com')
    expect(url.searchParams.get('config_id')).toBe('456')
    expect(url.searchParams.get('state')).toBe('opaque-state')
    expect(url.searchParams.has('scope')).toBe(false)
    expect(url.searchParams.has('client_secret')).toBe(false)
  })
  it('discovers the shared Instagram account, stores the business ID and subscribes with the system-user token', async () => {
    const bodies = [{ access_token: 'private-token', expires_in: 0 }, { id: 'system-user', client_business_id: '789' },
      { data: [{ id: '123', username: 'test' }] }, { success: true }]
    const fetch = jest.fn(async () => ({ ok: true, json: async () => bodies.shift() }))
    global.fetch = fetch as any
    const account = await new InstagramAdapter(new InstagramConfig(new ConfigService(values()))).exchange('code')
    expect(account).toEqual({ instagramId: '123', username: 'test', clientBusinessId: '789', token: 'private-token', expiresAt: null })
    expect(fetch.mock.calls.map((c: any) => new URL(c[0]).hostname)).toEqual(Array(4).fill('graph.facebook.com'))
    expect(fetch).toHaveBeenLastCalledWith('https://graph.facebook.com/v99.0/123/subscribed_apps', expect.objectContaining({
      method: 'POST', headers: { Authorization: 'Bearer private-token' },
    }))
  })
  it.each([{ data: [] }, { data: [{ id: '123', username: 'one' }, { id: '456', username: 'two' }] }])('refuses ambiguous or absent accounts before subscribing', async ({ data }) => {
    const bodies = [{ access_token: 'private-token' }, { client_business_id: '789' }, { data }]
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => bodies.shift() })) as any
    await expect(new InstagramAdapter(new InstagramConfig(new ConfigService(values()))).exchange('code')).rejects.toThrow('exatamente uma')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })
})
