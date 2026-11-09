import { ConfigService } from '@nestjs/config'
import { InstagramConfig } from './instagram.config'
import { InstagramAdapter } from './instagram.adapter'

describe('Instagram Meta transport', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })
  const values = () => ({ NODE_ENV: 'test', INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_APP_SECRET: 'secret',
    INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback', INSTAGRAM_SEND_ENABLED: 'true' })
  it('sends only to the fixed Instagram host using a bearer header', async () => {
    const fetch = jest.fn(async () => ({ ok: true, json: async () => ({ message_id: 'mid' }) }))
    global.fetch = fetch as any
    const adapter = new InstagramAdapter(new InstagramConfig(new ConfigService(values())))
    expect(await adapter.sendText('123', '456', 'private-token', 'Hello')).toBe('mid')
    expect(fetch).toHaveBeenCalledWith('https://graph.instagram.com/v99.0/123/messages', expect.objectContaining({
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
})
