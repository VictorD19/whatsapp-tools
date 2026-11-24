import { ConfigService } from '@nestjs/config'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'
import { InstagramConfig } from './instagram.config'
import { InstagramConnectionManager } from './instagram.connection'
import { InstagramTransportError } from './instagram.adapter'

function fixture() {
  const values: Record<string, string> = { NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'meta', INSTAGRAM_PILOT_TENANT_IDS: 'one,two',
    INSTAGRAM_APP_ID: '123', INSTAGRAM_APP_SECRET: 'app-secret', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0',
    INSTAGRAM_REDIRECT_URI: 'https://test.example/callback', ENCRYPTION_KEY: 'a'.repeat(32) }
  const configService = new ConfigService(values), config = new InstagramConfig(configService), crypto = new AesCryptoService(configService)
  const entries = new Map<string, { value: string; until: number }>(), queue = new Map<string, number>()
  const read = (key: string) => { const item = entries.get(key); return item && item.until > Date.now() ? item.value : null }
  const cache: any = {
    get: jest.fn(async key => read(key)),
    set: jest.fn(async (key, value, _ex, ttl, condition) => {
      if (condition === 'NX' && read(key) || condition === 'XX' && !read(key)) return null
      entries.set(key, { value, until: Date.now() + ttl * 1000 }); return 'OK'
    }),
    del: jest.fn(async key => Number(entries.delete(key))), zrem: jest.fn(async (_key, member) => Number(queue.delete(member))),
    zrangebyscore: jest.fn(async (_key, _from, until, _limit, _start, count) => [...queue].filter(([, score]) => score <= until).slice(0, count).map(([member]) => member)),
    eval: jest.fn(async (script, count, key, ...args) => {
      if (count === 2) {
        const [_queueKey, value, ttl, at, member] = args
        if (script.startsWith('-- store pending') ? !!read(key) : !read(key)) return 0
        await cache.set(key, value, 'EX', Number(ttl)); queue.set(member, Number(at)); return 1
      }
      if (read(key) === args[0]) { entries.delete(key); return 1 } return 0
    }),
  }
  const adapter: any = { exchangeToken: jest.fn(async () => ({ token: 'private-provider-token', expiresAt: null })),
    completeConnection: jest.fn(async (grant) => ({ ...grant, instagramId: '789', clientBusinessId: '101', username: 'test' })) }
  const persist = jest.fn(async () => ({ id: 'connected' }))
  const canComplete = jest.fn(async () => true)
  const make = () => new InstagramConnectionManager({ getClient: () => cache } as any, crypto, config, adapter, persist, canComplete)
  return { make, manager: make(), adapter, persist, canComplete, entries, queue, cache, values, crypto }
}

describe('Instagram pending authorization recovery', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-15T07:00:00Z')) })
  afterEach(() => jest.useRealTimers())
  it('encrypts a throttled authorization, resumes after restart and never exchanges its code twice', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValueOnce(new InstagramTransportError(true))
    expect(await f.manager.authorize('one', 'admin', 'one-use-code')).toEqual({ pending: true, retryAfterSeconds: 300 })
    const encoded = [...f.entries.values()].map(v => v.value).join('')
    expect(encoded).not.toContain('private-provider-token'); expect(encoded).not.toContain('one-use-code')
    expect(await f.manager.progress('one', 'admin')).toEqual({ state: 'waiting', retryAfterSeconds: 300 })
    expect(await f.manager.resume('one', 'admin')).toEqual({ pending: true, retryAfterSeconds: 300 })
    expect(f.adapter.completeConnection).toHaveBeenCalledTimes(1)
    jest.setSystemTime(Date.now() + 300_000)
    await f.make().processDue()
    expect(f.adapter.exchangeToken).toHaveBeenCalledTimes(1)
    expect(f.persist).toHaveBeenCalledWith('one', expect.objectContaining({ instagramId: '789', token: 'private-provider-token' }))
    expect(f.queue.size).toBe(0); expect((await f.manager.progress('one', 'admin')).state).toBe('none')
  })
  it('does not expose or resume another user or tenant grant', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValue(new InstagramTransportError(true))
    await f.manager.authorize('one', 'admin', 'code')
    expect(await f.manager.progress('two', 'admin')).toEqual({ state: 'none', retryAfterSeconds: 0 })
    expect(await f.manager.resume('one', 'other')).toEqual({ pending: false })
    await expect(f.manager.progress('foreign', 'admin')).rejects.toThrow()
    expect(f.adapter.completeConnection).toHaveBeenCalledTimes(1)
  })
  it('cancels queued work and never reconnects after cancellation', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValueOnce(new InstagramTransportError(true))
    await f.manager.authorize('one', 'admin', 'code'); await f.manager.cancel('one', 'admin')
    jest.setSystemTime(Date.now() + 600_000); await f.manager.processDue()
    expect(f.persist).not.toHaveBeenCalled(); expect(f.queue.size).toBe(0)
  })
  it('removes a grant if its administrator was removed or demoted while waiting', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValueOnce(new InstagramTransportError(true))
    await f.manager.authorize('one', 'admin', 'code'); f.canComplete.mockResolvedValue(false)
    jest.setSystemTime(Date.now() + 300_000); await f.manager.processDue()
    expect(f.persist).not.toHaveBeenCalled(); expect(f.queue.size).toBe(0)
    expect(f.adapter.completeConnection).toHaveBeenCalledTimes(1)
  })
  it('removes permanent errors rather than retrying denied permissions forever', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValue(new InstagramTransportError(false))
    await expect(f.manager.authorize('one', 'admin', 'code')).rejects.toThrow()
    expect(f.entries.size).toBe(0); expect(f.queue.size).toBe(0)
  })
  it('honors retry-after, expires grants and never sends a message', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValue(new InstagramTransportError(true, 3600))
    expect(await f.manager.authorize('one', 'admin', 'code')).toMatchObject({ retryAfterSeconds: 3600 })
    jest.setSystemTime(Date.now() + 3600_000); await f.manager.processDue()
    expect((await f.manager.progress('one', 'admin')).state).toBe('none'); expect(f.persist).not.toHaveBeenCalled()
    expect(f.adapter.completeConnection).toHaveBeenCalledTimes(1)
  })
  it('bounds exponential retries and does not keep a token indefinitely', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValue(new InstagramTransportError(true))
    await f.manager.authorize('one', 'admin', 'code')
    for (const seconds of [300, 600, 1200, 1500]) { jest.setSystemTime(Date.now() + seconds * 1000); await f.manager.processDue() }
    expect(f.adapter.completeConnection.mock.calls.length).toBeLessThanOrEqual(5)
    expect((await f.manager.progress('one', 'admin')).state).toBe('none')
  })
  it('serializes concurrent completion and refuses cancellation during its commit', async () => {
    const f = fixture(); let finish!: (value: any) => void, started!: () => void
    const entered = new Promise<void>(resolve => { started = resolve })
    f.adapter.completeConnection.mockImplementationOnce(() => { started(); return new Promise(resolve => { finish = resolve }) })
    const ongoing = f.manager.authorize('one', 'admin', 'code'); await entered
    expect(await f.manager.resume('one', 'admin')).toMatchObject({ pending: true })
    await expect(f.manager.cancel('one', 'admin')).rejects.toThrow('andamento')
    finish({ token: 'private-provider-token', expiresAt: null, instagramId: '789', username: 'test', clientBusinessId: '101' })
    expect(await ongoing).toEqual({ pending: false }); expect(f.persist).toHaveBeenCalledTimes(1)
  })
  it('drops a pending grant when the Meta app changes', async () => {
    const f = fixture(); f.adapter.completeConnection.mockRejectedValueOnce(new InstagramTransportError(true))
    await f.manager.authorize('one', 'admin', 'code'); f.values.INSTAGRAM_APP_ID = 'different'
    expect((await f.manager.progress('one', 'admin')).state).toBe('none'); expect(f.persist).not.toHaveBeenCalled()
  })
})
