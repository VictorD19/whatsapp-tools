import { ConfigService } from '@nestjs/config'
import { InstagramConfig } from './instagram.config'
import { InstagramService } from './instagram.service'
import { createHmac } from 'crypto'

function fixture() {
  const values: Record<string, string> = { NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'simulated', INSTAGRAM_PILOT_TENANT_IDS: 'one', INSTAGRAM_APP_SECRET: 'secret',
    INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify({ tenantId: 'one', instagramId: '123', participantId: '456' }) }
  const config = new InstagramConfig(({ get: (key: string, fallback: string) => values[key] ?? fallback } as unknown as ConfigService))
  const account = { id: 'a', tenantId: 'one', instagramId: '123', mode: 'simulated', active: true, accessToken: null, tokenExpiresAt: null, createdAt: new Date(Date.now() - 3600000) }
  const conversation = { id: 'c', tenantId: 'one', accountId: 'a', participantId: '456', lastInboundAt: new Date(), lastWebhookChannel: 'unknown', lastWebhookMessageAt: null }
  let message: any = null
  const db: any = {
    user: { findFirst: jest.fn(async () => ({ id: 'admin' })) },
    instagramAccount: { findFirst: jest.fn(async ({ where }) => where.tenantId === account.tenantId && where.id === account.id && (where.active === undefined || where.active === account.active) && (!where.mode || where.mode === account.mode) ? account : null), findUnique: jest.fn(async () => account), create: jest.fn(async () => ({ id: 'a' })), updateMany: jest.fn() },
    instagramConversation: { findFirst: jest.fn(async ({ where }) => where.tenantId === conversation.tenantId && where.id === conversation.id ? conversation : null), upsert: jest.fn(async () => conversation), updateMany: jest.fn(async () => ({ count: 1 })) },
    instagramMessage: {
      findFirst: jest.fn(async ({ where }) => message && where.id === message.id && where.tenantId === message.tenantId ? { ...message } : null),
      findUnique: jest.fn(async () => message),
      upsert: jest.fn(async ({ create }) => { message ||= { ...create, id: 'm' }; return { ...message } }),
      updateMany: jest.fn(async ({ where, data }) => {
        if (!message || (typeof where.status === 'string' && message.status !== where.status) ||
          where.status?.notIn?.includes(message.status) || (where.status?.in && !where.status.in.includes(message.status))) return { count: 0 }
        Object.assign(message, data); return { count: 1 }
      }),
      createMany: jest.fn(async () => ({ count: 1 })),
    },
  }
  db.$transaction = jest.fn(async callback => callback(db))
  const stored = new Map<string, string>()
  const cache = { set: jest.fn(async (key, value, ...args) => { if (args.includes('NX') && stored.has(key)) return null; stored.set(key, value); return 'OK' }),
    getdel: jest.fn(async key => { const value = stored.get(key); stored.delete(key); return value ?? null }), get: jest.fn(async key => stored.get(key) ?? null),
    del: jest.fn(async key => stored.delete(key)), eval: jest.fn(async (script, _count, key, ...args) => {
      if (script.startsWith('-- store pending') || script.startsWith('-- reschedule pending')) { await cache.set(key, args[1]); return 1 }
      if (await cache.get(key) === args[0]) { await cache.del(key); return 1 } return 0
    }), zadd: jest.fn(), zrem: jest.fn() }
  const redis: any = { getClient: () => cache }
  const crypto: any = { encrypt: jest.fn(x => 'encrypted:' + x), decrypt: jest.fn(x => x.startsWith('encrypted:') ? x.slice(10) : x) }
  const adapter: any = { sendText: jest.fn(async () => 'provider-mid'), authUrl: jest.fn(() => 'https://www.instagram.com/oauth/authorize'), exchange: jest.fn(async () => ({ instagramId: '123', username: 'test', token: 'sensitive', expiresAt: new Date(Date.now() + 10000) })) }
  adapter.exchangeToken = jest.fn(async code => ({ token: code, expiresAt: null }))
  adapter.completeConnection = jest.fn(async authorization => ({ instagramId: '123', username: 'test', clientBusinessId: '789', ...authorization }))
  return { service: new InstagramService(db, redis, crypto, config, adapter), db, adapter, cache, values, config, account, conversation, crypto }
}
describe('Instagram service', () => {
  const controlled = () => {
    const f = fixture()
    Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_SEND_ENABLED: 'true',
      INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify({ tenantId: 'one', instagramId: '123', participantId: '456' }) })
    f.account.mode = 'meta'; (f.account as any).accessToken = 'encrypted-token'
    return f
  }
  const reviewer = () => {
    const f=fixture()
    Object.assign(f.values,{INSTAGRAM_MODE:'meta',INSTAGRAM_PILOT_TENANT_IDS:'one,instagram-meta-review',
      INSTAGRAM_SEND_ENABLED:'false',INSTAGRAM_CONTROLLED_REPLY_SCOPE:'',
      INSTAGRAM_REVIEWER_REPLY_UNTIL:new Date(Math.floor((Date.now()+3600000)/1000)*1000).toISOString()})
    f.account.tenantId='instagram-meta-review'; f.account.mode='meta'; (f.account as any).accessToken='encrypted-token'
    f.conversation.tenantId='instagram-meta-review'
    return f
  }
  it('lets the isolated reviewer reply only through an account and conversation owned by that tenant', async () => {
    const f=reviewer()
    await expect(f.service.reply('one','c','blocked','foreign')).rejects.toThrow('indisponível')
    expect(f.adapter.sendText).not.toHaveBeenCalled()
    expect(await f.service.reply('instagram-meta-review','c','review reply','request')).toMatchObject({status:'sent'})
    expect(f.adapter.sendText).toHaveBeenCalledWith('123','456','encrypted-token','review reply','instagram-meta-review')
    const foreign=reviewer(); foreign.account.tenantId='one'
    await expect(foreign.service.reply('instagram-meta-review','c','blocked','request')).rejects.toThrow('indisponível')
    expect(foreign.adapter.sendText).not.toHaveBeenCalled()
  })
  it('rechecks the reviewer deadline after the outgoing claim and keeps the 24h and standby guards', async () => {
    const f=reviewer(), original=f.db.instagramMessage.upsert.getMockImplementation()
    f.db.instagramMessage.upsert.mockImplementationOnce(async(args:any)=>{
      const message=await original(args); f.values.INSTAGRAM_REVIEWER_REPLY_UNTIL='2000-01-01T00:00:00.000Z';return message
    })
    expect(await f.service.reply('instagram-meta-review','c','blocked','request')).toMatchObject({status:'unknown'})
    expect(f.adapter.sendText).not.toHaveBeenCalled()
    for(const passive of [true,false]){const f=reviewer();if(passive)f.conversation.lastWebhookChannel='standby';else f.conversation.lastInboundAt=new Date(Date.now()-25*3600000)
      await expect(f.service.reply('instagram-meta-review','c','blocked','request')).rejects.toThrow()
      expect(f.adapter.sendText).not.toHaveBeenCalled()
    }
  })
  it('allows the controlled reply but refuses another participant before creating an outgoing attempt', async () => {
    const f = controlled()
    expect(await f.service.reply('one', 'c', 'Controlled reply', 'request')).toMatchObject({ status: 'sent' })
    const other = controlled(); other.conversation.participantId = '789'
    await expect(other.service.reply('one', 'c', 'Do not send', 'other')).rejects.toThrow('esta conversa')
    expect(other.db.instagramMessage.upsert).not.toHaveBeenCalled()
    expect(other.adapter.sendText).not.toHaveBeenCalled()
  })
  it('rechecks a controlled scope revoked during the send claim without calling Meta', async () => {
    const f = controlled(), original = f.db.instagramMessage.upsert.getMockImplementation()
    f.db.instagramMessage.upsert.mockImplementationOnce(async (args: any) => {
      const message = await original(args)
      f.values.INSTAGRAM_CONTROLLED_REPLY_SCOPE = '{}'
      return message
    })
    expect(await f.service.reply('one', 'c', 'Do not send', 'request')).toMatchObject({ status: 'unknown' })
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('uses the refreshed reply window rather than a stale conversation snapshot', async () => {
    const f = controlled()
    f.db.instagramConversation.findFirst.mockResolvedValueOnce({ ...f.conversation })
      .mockResolvedValueOnce({ ...f.conversation, lastInboundAt: new Date(Date.now() - 25 * 3600000) })
    expect(await f.service.reply('one', 'c', 'Do not send', 'request')).toMatchObject({ status: 'unknown' })
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('erases message text locally, retains deduplication IDs and makes deletion idempotent without a provider call', async () => {
    const f = fixture()
    await f.service.reply('one', 'c', 'Synthetic removable text', 'request')
    f.adapter.sendText.mockClear()
    const before = f.conversation.lastInboundAt
    expect(await f.service.deleteMessage('one', 'm')).toEqual({ deleted: true })
    expect(await f.db.instagramMessage.findFirst({ where: { id: 'm', tenantId: 'one' } })).toMatchObject({
      text: '', status: 'deleted', providerMessageId: 'provider-mid', requestId: 'request', conversationId: 'c',
    })
    expect(await f.service.deleteMessage('one', 'm')).toEqual({ deleted: true })
    await expect(f.service.reply('one', 'c', 'Synthetic removable text', 'request')).rejects.toThrow('Identificador')
    expect(f.conversation.lastInboundAt).toEqual(before)
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('does not erase another tenant’s message even when both tenants are enabled', async () => {
    const f = fixture(); f.values.INSTAGRAM_PILOT_TENANT_IDS = 'one,two'
    await f.service.reply('one', 'c', 'Synthetic private text', 'request')
    f.db.instagramMessage.updateMany.mockClear()
    await expect(f.service.deleteMessage('two', 'm')).rejects.toThrow('indisponível')
    expect(f.db.instagramMessage.updateMany).not.toHaveBeenCalled()
    expect((await f.db.instagramMessage.findFirst({ where: { id: 'm', tenantId: 'one' } })).text).toBe('Synthetic private text')
  })
  it('keeps uncertain outgoing attempts available for reconciliation', async () => {
    const f = fixture(); f.adapter.sendText.mockRejectedValue(new Error('uncertain transport'))
    await f.service.reply('one', 'c', 'Uncertain attempt', 'request')
    f.db.instagramMessage.updateMany.mockClear()
    await expect(f.service.deleteMessage('one', 'm')).rejects.toThrow('sem confirmação')
    expect(f.db.instagramMessage.updateMany).not.toHaveBeenCalled()
    expect((await f.db.instagramMessage.findFirst({ where: { id: 'm', tenantId: 'one' } })).text).toBe('Uncertain attempt')
  })
  it('fails closed if message state changes during operator deletion', async () => {
    const f = fixture(); await f.service.reply('one', 'c', 'Synthetic text', 'request')
    f.db.instagramMessage.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(f.service.deleteMessage('one', 'm')).rejects.toThrow('mensagem mudou')
    expect((await f.db.instagramMessage.findFirst({ where: { id: 'm', tenantId: 'one' } })).text).toBe('Synthetic text')
  })
  it('refuses an inactive or different-mode account when deleting a message', async () => {
    const f = fixture(); await f.service.reply('one', 'c', 'Synthetic text', 'request')
    f.account.active = false
    await expect(f.service.deleteMessage('one', 'm')).rejects.toThrow('indisponível')
    f.account.active = true; f.values.INSTAGRAM_MODE = 'meta'
    await expect(f.service.deleteMessage('one', 'm')).rejects.toThrow('indisponível')
    expect((await f.db.instagramMessage.findFirst({ where: { id: 'm', tenantId: 'one' } })).text).toBe('Synthetic text')
  })
  it('does not expose simulated cancellation in Meta mode or to a different tenant', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'
    await expect(f.service.simulateCancellation('one', 'message')).rejects.toThrow()
    f.values.INSTAGRAM_MODE = 'simulated'
    await expect(f.service.simulateCancellation('another', 'message')).rejects.toThrow()
    expect(f.db.$transaction).not.toHaveBeenCalled()
  })
  it('requires a signature before applying scoped, text-free cancellation tombstones', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.account.mode = 'meta'
    const body = { object: 'instagram', entry: [{ id: '123', messaging: [{ sender: { id: '456' }, recipient: { id: '123' },
      timestamp: Date.now(), message: { mid: 'cancelled', is_deleted: true } }] }] }
    const raw = Buffer.from(JSON.stringify(body))
    await expect(f.service.webhook(raw, undefined, body)).rejects.toThrow()
    expect(f.db.$transaction).not.toHaveBeenCalled()
    await f.service.webhook(raw, 'sha256=' + createHmac('sha256', 'secret').update(raw).digest('hex'), body)
    expect(f.db.instagramMessage.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ text: '', status: 'unsent', tenantId: 'one', accountId: 'a' })] }))
    expect(f.db.instagramMessage.updateMany).toHaveBeenCalledWith({ where: { tenantId: 'one', accountId: 'a', conversationId: 'c',
      direction: 'in', providerMessageId: 'cancelled', status: { notIn: ['unsent', 'deleted'] } }, data: { text: '', status: 'unsent' } })
    expect(f.db.instagramConversation.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastInboundAt: expect.anything() }) }))
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('never sends a response to a passive conversation even with real sending enabled', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.values.INSTAGRAM_SEND_ENABLED = 'true'
    f.account.mode = 'meta'; (f.account as any).accessToken = 'encrypted-token'; f.conversation.lastWebhookChannel = 'standby'
    await expect(f.service.reply('one', 'c', 'text', 'request')).rejects.toThrow('somente leitura')
    expect(f.adapter.sendText).not.toHaveBeenCalled()
    expect(f.db.instagramMessage.upsert).not.toHaveBeenCalled()
  })
  it('rechecks passive delivery before transport when control changes during a reply', async () => {
    const f = fixture()
    f.db.instagramConversation.findFirst.mockResolvedValueOnce({ ...f.conversation }).mockResolvedValueOnce({ ...f.conversation, lastWebhookChannel: 'standby' })
    expect(await f.service.reply('one', 'c', 'text', 'request')).toMatchObject({ status: 'unknown' })
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('stores passive channel state separately from deduplication and inbound time', async () => {
    const f = fixture(); f.values.INSTAGRAM_MODE = 'meta'; f.account.mode = 'meta'
    const at = Date.now(), body = { object: 'instagram', entry: [{ id: '123', standby: [{ sender: { id: '456' }, recipient: { id: '123' }, timestamp: at, message: { mid: 'in-standby', text: 'hello' } }] }] }
    const raw = Buffer.from(JSON.stringify(body)), signature = 'sha256=' + createHmac('sha256', 'secret').update(raw).digest('hex')
    f.db.instagramMessage.createMany.mockResolvedValue({ count: 0 })
    await f.service.webhook(raw, signature, body)
    expect(f.db.instagramConversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'one' }),
      data: { lastWebhookChannel: 'standby', lastWebhookMessageAt: new Date(at) },
    }))
    expect(f.adapter.sendText).not.toHaveBeenCalled()
  })
  it('syncs through the guarded persistence path without sending and respects the shared cooldown', async () => {
    const f = fixture(); Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback' })
    f.account.mode = 'meta'; (f.account as any).accessToken = 'encrypted-token'
    const read = jest.fn(async () => [{ accountId: '123', participantId: '456', messageId: 'provider-id', text: 'text', at: new Date() }])
    ;(f.adapter as any).readRecentIncoming = read
    f.cache.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null)
    expect(await f.service.sync('one', 'a')).toMatchObject({ synchronized: true, processed: 1 })
    expect(read).toHaveBeenCalledWith('123', 'encrypted-token', f.account.createdAt.getTime())
    expect(f.cache.get).toHaveBeenCalled()
    expect(f.db.instagramMessage.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }))
    expect(await f.service.sync('one', 'a')).toMatchObject({ synchronized: false })
    expect(read).toHaveBeenCalledTimes(1)
    expect(f.adapter.sendText).not.toHaveBeenCalled()
    expect(f.db.instagramConversation.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastWebhookChannel: expect.any(String) }) }))
    await expect(f.service.sync('other', 'a')).rejects.toThrow()
    expect(read).toHaveBeenCalledTimes(1)
  })
  it('discards an in-flight synchronization if its connection was revoked', async () => {
    const f = fixture(); Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback' })
    f.account.mode = 'meta'; (f.account as any).accessToken = 'encrypted-token'
    ;(f.adapter as any).readRecentIncoming = jest.fn(async () => [{ accountId: '123', participantId: '456', messageId: 'provider-id', text: 'text', at: new Date() }])
    f.cache.set.mockResolvedValue('OK')
    f.db.instagramAccount.findFirst.mockResolvedValueOnce(f.account).mockResolvedValueOnce(null)
    expect(await f.service.sync('one', 'a')).toMatchObject({ synchronized: false, processed: 0 })
    expect(f.db.instagramMessage.createMany).not.toHaveBeenCalled()
  })
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
    Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback' })
    const states = new Map<string, string>()
    f.cache.set.mockImplementation(async (key, value) => { states.set(key, value); return 'OK' })
    f.cache.get.mockImplementation(async key => states.get(key) ?? null)
    f.cache.getdel.mockImplementation(async key => { const value = states.get(key); states.delete(key); return value ?? null })
    f.db.instagramAccount.findUnique.mockResolvedValue(null)
    f.adapter.completeConnection.mockImplementation(async ({ token }: { token: string }) => ({ instagramId: token === 'first' ? '101' : '102',
      username: token, clientBusinessId: token === 'first' ? '701' : '702', token: 'token-' + token, expiresAt: null }))
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
    Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback' })
    f.cache.getdel.mockResolvedValue(JSON.stringify({ tenantId: 'two', userId: 'admin-two' }))
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
    expect(f.db.instagramConversation.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastInboundAt: expect.any(Date) }) }))
  })
  it('uses opaque expiring OAuth state and rejects replay', async () => {
    const f = fixture()
    Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback' })
    await f.service.connect('one', 'admin')
    expect(f.cache.set).toHaveBeenCalledWith(expect.stringMatching(/^instagram:oauth:[\w-]{43}$/), JSON.stringify({ tenantId: 'one', userId: 'admin' }), 'EX', 600, 'NX')
    f.cache.getdel.mockResolvedValueOnce(JSON.stringify({ tenantId: 'one', userId: 'admin' })).mockResolvedValueOnce(null)
    f.db.instagramAccount.findUnique.mockResolvedValue(null)
    await f.service.callback('code', 'a'.repeat(43))
    expect(f.crypto.encrypt).toHaveBeenCalledWith('code')
    expect(f.db.instagramAccount.create).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ accessToken: true }) }))
    await expect(f.service.callback('code', 'a'.repeat(43))).rejects.toThrow()
    expect(f.adapter.exchangeToken).toHaveBeenCalledTimes(1)
  })
  it('never updates an account concurrently claimed by another tenant', async () => {
    const f = fixture(); f.cache.getdel.mockResolvedValue(JSON.stringify({ tenantId: 'one', userId: 'admin' }))
    Object.assign(f.values, { INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v99.0', INSTAGRAM_REDIRECT_URI: 'https://test.example/callback' })
    f.db.instagramAccount.findUnique.mockResolvedValue(null)
    f.db.instagramAccount.create.mockRejectedValue(new Error('unique conflict'))
    await expect(f.service.callback('code', 'a'.repeat(43))).rejects.toThrow()
    expect(f.db.instagramAccount.updateMany).not.toHaveBeenCalled()
  })
})
