import { ConfigService } from '@nestjs/config'
import { InstagramConfig } from './instagram.config'
import { InstagramService } from './instagram.service'
import { createHmac } from 'crypto'

function fixture() {
  const values: Record<string, string> = { NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'simulated', INSTAGRAM_PILOT_TENANT_IDS: 'one', INSTAGRAM_APP_SECRET: 'secret' }
  const config = new InstagramConfig(({ get: (key: string, fallback: string) => values[key] ?? fallback } as unknown as ConfigService))
  const account = { id: 'a', tenantId: 'one', instagramId: '123', mode: 'simulated', active: true, accessToken: null, tokenExpiresAt: null }
  const conversation = { id: 'c', tenantId: 'one', accountId: 'a', participantId: '456', lastInboundAt: new Date() }
  let message: any = null
  const db: any = {
    instagramAccount: { findFirst: jest.fn(async ({ where }) => where.tenantId === account.tenantId && where.id === account.id ? account : null), findUnique: jest.fn(async () => account), create: jest.fn(async () => ({ id: 'a' })), updateMany: jest.fn() },
    instagramConversation: { findFirst: jest.fn(async ({ where }) => where.tenantId === conversation.tenantId && where.id === conversation.id ? conversation : null), upsert: jest.fn(async () => conversation), updateMany: jest.fn(async () => ({ count: 1 })) },
    instagramMessage: {
      findUnique: jest.fn(async () => message),
      upsert: jest.fn(async ({ create }) => { message ||= { ...create, id: 'm' }; return { ...message } }),
      updateMany: jest.fn(async ({ where, data }) => {
        if (!message || (where.status && message.status !== where.status)) return { count: 0 }
        Object.assign(message, data); return { count: 1 }
      }),
      createMany: jest.fn(async () => ({ count: 1 })),
    },
  }
  db.$transaction = jest.fn(async callback => callback(db))
  const cache = { set: jest.fn(), getdel: jest.fn(), get: jest.fn(async () => null as string | null) }
  const redis: any = { getClient: () => cache }
  const crypto: any = { encrypt: jest.fn(x => 'encrypted:' + x), decrypt: jest.fn(x => x) }
  const adapter: any = { sendText: jest.fn(async () => 'provider-mid'), authUrl: jest.fn(() => 'https://www.instagram.com/oauth/authorize'), exchange: jest.fn(async () => ({ instagramId: '123', username: 'test', token: 'sensitive', expiresAt: new Date(Date.now() + 10000) })) }
  return { service: new InstagramService(db, redis, crypto, config, adapter), db, adapter, cache, values, config, account, conversation, crypto }
}
describe('Instagram service', () => {
  it('ignores redelivery of erased messages but accepts a new message after deletion', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.account.mode = 'meta'
    const cutoff = Date.now() - 1000
    f.cache.get.mockResolvedValue(String(cutoff))
    const deliver = async (timestamp: number) => {
      const body = { object: 'instagram', entry: [{ id: '123', messaging: [{ sender: { id: '456' }, recipient: { id: '123' }, timestamp, message: { mid: String(timestamp), text: 'test' } }] }] }
      const raw = Buffer.from(JSON.stringify(body))
      return f.service.webhook(raw, 'sha256=' + createHmac('sha256', 'secret').update(raw).digest('hex'), body)
    }
    await deliver(cutoff)
    expect(f.db.instagramMessage.createMany).not.toHaveBeenCalled()
    await deliver(cutoff + 1)
    expect(f.db.instagramMessage.createMany).toHaveBeenCalledTimes(1)
    f.cache.get.mockRejectedValueOnce(new Error('redis unavailable'))
    await expect(deliver(cutoff + 2)).rejects.toThrow()
    expect(f.db.instagramMessage.createMany).toHaveBeenCalledTimes(1)
  })
  it('binds separate customer authorizations to their own tenants using the same app', async () => {
    const f = fixture(); f.values.INSTAGRAM_PILOT_TENANT_IDS = 'one,two'
    const states = new Map<string, string>()
    f.cache.set.mockImplementation(async (key, value) => { states.set(key, value); return 'OK' })
    f.cache.getdel.mockImplementation(async key => { const value = states.get(key); states.delete(key); return value })
    f.db.instagramAccount.findUnique.mockResolvedValue(null)
    f.adapter.exchange.mockImplementation(async (code: string) => ({ instagramId: code === 'first' ? '101' : '102',
      username: code, clientBusinessId: code === 'first' ? '701' : '702', token: 'token-' + code, expiresAt: null }))
    await f.service.connect('one', 'admin-one'); await f.service.connect('two', 'admin-two')
    const keys = [...states.keys()]
    expect(keys[0]).not.toBe(keys[1])
    await f.service.callback('first', keys[0].replace('instagram:oauth:', ''))
    await f.service.callback('second', keys[1].replace('instagram:oauth:', ''))
    expect(f.db.instagramAccount.create.mock.calls.map(([args]: any[]) => ({ tenant: args.data.tenantId,
      business: args.data.clientBusinessId, token: args.data.accessToken }))).toEqual([
      { tenant: 'one', business: '701', token: 'encrypted:token-first' },
      { tenant: 'two', business: '702', token: 'encrypted:token-second' },
    ])
  })
  it('refuses to attach an account already owned by another customer', async () => {
    const f = fixture(); f.values.INSTAGRAM_PILOT_TENANT_IDS = 'one,two'
    f.cache.getdel.mockResolvedValue(JSON.stringify({ tenantId: 'two' }))
    await expect(f.service.callback('code', 'a'.repeat(43))).rejects.toThrow('indisponível para esta empresa')
    expect(f.db.instagramAccount.create).not.toHaveBeenCalled()
    expect(f.db.instagramAccount.updateMany).not.toHaveBeenCalled()
  })
  it('lists only accounts for the current connection mode', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.db.instagramAccount.findMany = jest.fn(async () => [])
    await f.service.accounts('one')
    expect(f.db.instagramAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'one', mode: 'meta' } }))
  })
  it('accepts a valid Unified Login token with no scheduled expiration', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.values.INSTAGRAM_SEND_ENABLED = 'true'; f.account.mode = 'meta'
    ;(f.account as any).accessToken = 'encrypted-token'
    expect((await f.service.reply('one', 'c', 'text', 'request')).status).toBe('sent')
    expect(f.adapter.sendText).toHaveBeenCalledTimes(1)
  })
  it('rejects an explicitly expired Meta token', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.values.INSTAGRAM_SEND_ENABLED = 'true'; f.account.mode = 'meta'
    ;(f.account as any).accessToken = 'encrypted-token'; (f.account as any).tokenExpiresAt = new Date(Date.now() - 1000)
    await expect(f.service.reply('one', 'c', 'text', 'request')).rejects.toThrow('expirada')
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('does not query another tenant or allow a disabled pilot', async () => {
    const f = fixture()
    await expect(f.service.reply('other', 'c', 'text', 'request')).rejects.toThrow()
    expect(f.db.instagramConversation.findFirst).not.toHaveBeenCalled()
    f.values.INSTAGRAM_ENABLED = 'false'
    await expect(f.service.reply('one', 'c', 'text', 'request')).rejects.toThrow()
  })
  it('checks conversation ownership before reading account credentials', async () => {
    const f = fixture()
    await expect(f.service.reply('one', 'foreign', 'text', 'request')).rejects.toThrow()
    expect(f.adapter.sendText).not.toHaveBeenCalled()
    expect(f.db.instagramAccount.findFirst).not.toHaveBeenCalled()
  })
  it('sends once for repeated or concurrent request IDs', async () => {
    const f = fixture()
    const results = await Promise.all([f.service.reply('one', 'c', 'text', 'request'), f.service.reply('one', 'c', 'text', 'request')])
    expect(results[0].id).toBe(results[1].id)
    expect(f.adapter.sendText).toHaveBeenCalledTimes(1)
    await f.service.reply('one', 'c', 'text', 'request')
    expect(f.adapter.sendText).toHaveBeenCalledTimes(1)
  })
  it('rejects reuse of an ID with different content', async () => {
    const f = fixture()
    await f.service.reply('one', 'c', 'first', 'request')
    await expect(f.service.reply('one', 'c', 'changed', 'request')).rejects.toThrow()
    expect(f.adapter.sendText).toHaveBeenCalledTimes(1)
  })
  it('preserves an uncertain send and does not resend after timeout', async () => {
    const f = fixture(); f.adapter.sendText.mockRejectedValue(new Error('timeout'))
    expect((await f.service.reply('one', 'c', 'text', 'request')).status).toBe('unknown')
    expect((await f.service.reply('one', 'c', 'text', 'request')).status).toBe('unknown')
    expect(f.adapter.sendText).toHaveBeenCalledTimes(1)
  })
  it('blocks replies outside the 24h window', async () => {
    const f = fixture(); f.conversation.lastInboundAt = new Date(Date.now() - 86400001)
    await expect(f.service.reply('one', 'c', 'text', 'request')).rejects.toThrow()
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('blocks real sends while the real-send flag is off', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.account.mode = 'meta'; (f.account as any).tokenExpiresAt = new Date(Date.now() + 100000)
    await expect(f.service.reply('one', 'c', 'text', 'request')).rejects.toThrow()
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('rejects forged webhooks before looking up an account', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'
    await expect(f.service.webhook(Buffer.from('{}'), 'sha256=' + '0'.repeat(64), {})).rejects.toThrow()
    expect(f.db.instagramAccount.findUnique).not.toHaveBeenCalled()
  })
  it('does not reopen the reply window for a repeated inbound event', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.account.mode = 'meta'
    const body = { object: 'instagram', entry: [{ id: '123', messaging: [{ sender: { id: '456' }, recipient: { id: '123' }, timestamp: Date.now(), message: { mid: 'in-1', text: 'hello' } }] }] }
    const raw = Buffer.from(JSON.stringify(body)), signature = 'sha256=' + createHmac('sha256', 'secret').update(raw).digest('hex')
    f.db.instagramMessage.createMany.mockResolvedValue({ count: 0 })
    await f.service.webhook(raw, signature, body)
    expect(f.db.instagramConversation.updateMany).not.toHaveBeenCalled()
  })
  it('uses opaque expiring OAuth state and rejects replay', async () => {
    const f = fixture()
    await f.service.connect('one', 'admin')
    expect(f.cache.set).toHaveBeenCalledWith(expect.stringMatching(/^instagram:oauth:[\w-]{43}$/), JSON.stringify({ tenantId: 'one', userId: 'admin' }), 'EX', 600, 'NX')
    f.cache.getdel.mockResolvedValueOnce(JSON.stringify({ tenantId: 'one' })).mockResolvedValueOnce(null)
    f.db.instagramAccount.findUnique.mockResolvedValue(null)
    await f.service.callback('code', 'a'.repeat(43))
    expect(f.crypto.encrypt).toHaveBeenCalledWith('sensitive')
    expect(f.db.instagramAccount.create).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ accessToken: true }) }))
    await expect(f.service.callback('code', 'a'.repeat(43))).rejects.toThrow()
    expect(f.adapter.exchange).toHaveBeenCalledTimes(1)
  })
  it('never updates an account concurrently claimed by another tenant', async () => {
    const f = fixture(); f.cache.getdel.mockResolvedValue(JSON.stringify({ tenantId: 'one' }))
    f.db.instagramAccount.findUnique.mockResolvedValue(null)
    f.db.instagramAccount.create.mockRejectedValue(new Error('unique conflict'))
    await expect(f.service.callback('code', 'a'.repeat(43))).rejects.toThrow()
    expect(f.db.instagramAccount.updateMany).not.toHaveBeenCalled()
  })
})
