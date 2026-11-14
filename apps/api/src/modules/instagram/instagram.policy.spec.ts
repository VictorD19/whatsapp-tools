import { createHmac } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { InstagramConfig } from './instagram.config'
import { canReply, incomingDirects, REPLY_WINDOW, signatureMatches } from './instagram.policy'

const now = Date.parse('2026-11-09T18:00:00Z')
function payload(change: any = {}) {
  return { object: 'instagram', entry: [{ id: '123', messaging: [{ sender: { id: '456' }, recipient: { id: '123' }, timestamp: now,
    message: { mid: 'mid-1', text: 'Olá' }, ...change }] }] }
}
describe('Instagram pilot policy', () => {
  it('verifies the exact raw bytes with HMAC SHA256', () => {
    const raw = Buffer.from('{"message":"Olá"}')
    const signature = 'sha256=' + createHmac('sha256', 'test-secret').update(raw).digest('hex')
    expect(signatureMatches(raw, signature, 'test-secret')).toBe(true)
    expect(signatureMatches(Buffer.from('{ "message":"Olá"}'), signature, 'test-secret')).toBe(false)
  })
  it.each([undefined, '', 'sha256=bad', 'sha1=' + 'a'.repeat(40), 'sha256=' + 'g'.repeat(64)])('rejects missing or malformed signatures: %s', signature => {
    expect(signatureMatches(Buffer.from('body'), signature, 'secret')).toBe(false)
  })
  it('does not accept an empty signing secret', () => { expect(signatureMatches(Buffer.from(''), 'sha256=' + 'a'.repeat(64), '')).toBe(false) })
  it('enforces the original last inbound time and the exact 24h boundary', () => {
    expect(canReply(new Date(now - REPLY_WINDOW + 1), now)).toBe(true)
    expect(canReply(new Date(now - REPLY_WINDOW), now)).toBe(false)
    expect(canReply(null, now)).toBe(false)
    expect(canReply(new Date(now + 1), now)).toBe(false)
  })
  it('normalizes a real-shaped direct event', () => {
    expect(incomingDirects(payload(), now)).toEqual([{ accountId: '123', participantId: '456', messageId: 'mid-1', text: 'Olá', at: new Date(now) }])
  })
  it('marks standby deliveries as passive and applies the same recipient and echo checks', () => {
    const event = payload().entry[0].messaging[0]
    const expected = { accountId: '123', participantId: '456', messageId: 'mid-1', text: 'Olá', at: new Date(now), standby: true }
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', standby: [event] }] }, now)).toEqual([expected])
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', changes: [{ field: 'standby', value: event }] }] }, now)).toEqual([expected])
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '999', standby: [event] }] }, now)).toEqual([])
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', standby: [{ ...event, message: { ...event.message, is_echo: true } }] }] }, now)).toEqual([])
  })
  it.each([String(now), String(now / 1000), now / 1000])('normalizes a Unified Login change with timestamp %s', timestamp => {
    const value = payload({ timestamp }).entry[0].messaging[0]
    const body = { object: 'instagram', entry: [{ id: '123', changes: [{ field: 'messages', value }] }] }
    expect(incomingDirects(body, now)).toEqual([{ accountId: '123', participantId: '456', messageId: 'mid-1', text: 'Olá', at: new Date(now) }])
  })
  it('does not treat unrelated changes or mismatched recipients as Directs', () => {
    const value = payload().entry[0].messaging[0]
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', changes: [{ field: 'comments', value }] }] }, now)).toEqual([])
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '999', changes: [{ field: 'messages', value }] }] }, now)).toEqual([])
    for (const flag of ['is_echo', 'is_deleted', 'is_unsupported']) {
      expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', changes: [{ field: 'messages', value: { ...value, message: { ...value.message, [flag]: true } } }] }] }, now)).toEqual([])
    }
  })
  it('ignores malformed change envelopes and unsafe timestamp coercions', () => {
    expect(incomingDirects({ object: 'instagram', entry: [null, { id: '123', changes: [null, { field: 'messages', value: null }] }] }, now)).toEqual([])
    for (const timestamp of [null, true, [], {}, '1e12', ' 1794247200000 ', now + 0.5, String((now + 301000) / 1000)]) {
      const value = payload({ timestamp }).entry[0].messaging[0]
      expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', changes: [{ field: 'messages', value }] }] }, now)).toEqual([])
    }
  })
  it('ignores echoed/deleted/unsupported messages', () => {
    for (const flag of ['is_echo', 'is_deleted', 'is_unsupported']) expect(incomingDirects(payload({ message: { mid: 'x', text: 'text', [flag]: true } }), now)).toEqual([])
  })
  it('does not open a reply window from another recipient or an invalid sender', () => {
    expect(incomingDirects(payload({ recipient: { id: '999' } }), now)).toEqual([])
    expect(incomingDirects(payload({ sender: { id: '123' } }), now)).toEqual([])
    expect(incomingDirects(payload({ sender: { id: '../../' } }), now)).toEqual([])
  })
  it('ignores comments, malformed entries and far future timestamps', () => {
    expect(incomingDirects({ object: 'page', entry: [] }, now)).toEqual([])
    expect(incomingDirects({ object: 'instagram', entry: [{ id: '123', changes: [] }] }, now)).toEqual([])
    expect(incomingDirects(payload({ timestamp: now + 300001 }), now)).toEqual([])
    expect(incomingDirects(payload({ timestamp: 'not a timestamp' }), now)).toEqual([])
  })
  it('clamps clock skew instead of extending the window into the future', () => {
    expect(incomingDirects(payload({ timestamp: now + 100 }), now)[0].at.getTime()).toBe(now)
  })
  it('is disabled by default, for non-pilot tenants and always in production', () => {
    const make = (config: Record<string, string>) => new InstagramConfig(({ get: (key: string, fallback: string) => config[key] ?? fallback } as unknown as ConfigService))
    expect(make({ NODE_ENV: 'test' }).enabled()).toBe(false)
    const pilot = make({ NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_PILOT_TENANT_IDS: 'one,two' })
    expect(pilot.allowed('one')).toBe(true)
    expect(pilot.allowed('other')).toBe(false)
    expect(() => pilot.assertTenant('other')).toThrow()
    expect(make({ NODE_ENV: 'production', INSTAGRAM_ENABLED: 'true', INSTAGRAM_PILOT_TENANT_IDS: 'one' }).allowed('one')).toBe(false)
  })
  it('requires explicit real-provider configuration and separates simulation', () => {
    const config = new InstagramConfig(new ConfigService({ NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'meta', INSTAGRAM_PILOT_TENANT_IDS: 'one' }))
    expect(() => config.assertMeta()).toThrow()
    expect(() => config.assertSimulated('one')).toThrow()
  })
})
