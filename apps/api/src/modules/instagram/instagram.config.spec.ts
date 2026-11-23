import { ConfigService } from '@nestjs/config'
import { InstagramConfig } from './instagram.config'

describe('Instagram controlled reply scope', () => {
  const values = { NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'meta',
    INSTAGRAM_PILOT_TENANT_IDS: 'one,two', INSTAGRAM_SEND_ENABLED: 'true' }
  const scope = { tenantId: 'one', instagramId: '123', participantId: '456' }
  const make = (extra = {}) => {
    const config: Record<string, string> = { ...values, INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify(scope), ...extra }
    return new InstagramConfig({ get: (key: string, fallback: string) => config[key] ?? fallback } as ConfigService)
  }

  it('allows only the configured tenant, connected account and recipient', () => {
    const c = make()
    expect(c.replyTargetAllowed('one', '123', '456')).toBe(true)
    expect(c.replyTargetAllowed('two', '123', '456')).toBe(false)
    expect(c.replyTargetAllowed('one', '789', '456')).toBe(false)
    expect(c.replyTargetAllowed('one', '123', '789')).toBe(false)
    expect(c.realSendingAllowed('two')).toBe(false)
    expect(c.transportTargetAllowed('123', '789')).toBe(false)
  })
  it.each(['', '{', 'null', '[]', '{}', JSON.stringify({ ...scope, participantId: 456 }),
    JSON.stringify({ ...scope, participantId: '123' }), JSON.stringify({ ...scope, recipient: '789' }),
    JSON.stringify({ ...scope, instagramId: 'https://example.invalid' }), 'x'.repeat(1001)])(
    'fails closed for malformed or ambiguous scope %s', raw => {
      const c = make({ INSTAGRAM_CONTROLLED_REPLY_SCOPE: raw })
      expect(c.realSendingAllowed('one')).toBe(false)
      expect(c.replyTargetAllowed('one', '123', '456')).toBe(false)
      expect(c.transportTargetAllowed('123', '456')).toBe(false)
    })
  it('never overrides the send flag, pilot allowlist or production lock', () => {
    for (const extra of [{ INSTAGRAM_SEND_ENABLED: 'false' }, { INSTAGRAM_ENABLED: 'false' },
      { INSTAGRAM_PILOT_TENANT_IDS: 'two' }, { NODE_ENV: 'production' }]) {
      expect(make(extra).replyTargetAllowed('one', '123', '456')).toBe(false)
    }
  })
})

 describe('Instagram isolated reviewer reply deadline', () => {
  const make = (extra: Record<string,string | undefined> = {}) => { const values:Record<string,string | undefined> = {
    NODE_ENV:'test', INSTAGRAM_ENABLED:'true', INSTAGRAM_MODE:'meta',
    INSTAGRAM_PILOT_TENANT_IDS:'instagram-review,instagram-meta-review', INSTAGRAM_SEND_ENABLED:'false',
    INSTAGRAM_REVIEWER_REPLY_UNTIL: new Date(Math.floor((Date.now()+3600000)/1000)*1000).toISOString(), ...extra,
  }; return new InstagramConfig({get:(key:string,fallback:string)=>values[key]??fallback} as ConfigService) }
  it('allows only the separate reviewer tenant and requires tenant context at transport', () => {
    const c=make()
    expect(c.replyTargetAllowed('instagram-meta-review','123','456')).toBe(true)
    expect(c.realSendingAllowed('instagram-review')).toBe(false)
    expect(c.replyTargetAllowed('instagram-review','123','456')).toBe(false)
    expect(c.transportTargetAllowed('123','456')).toBe(false)
    expect(c.transportTargetAllowed('123','456','instagram-review')).toBe(false)
    expect(c.replyTargetAllowed('instagram-meta-review','123','123')).toBe(false)
    expect(c.replyTargetAllowed('instagram-meta-review','/evil','456')).toBe(false)
  })
  it('expires without restarting the pilot and cannot override production or tenant isolation', () => {
    for(const extra of [{INSTAGRAM_REVIEWER_REPLY_UNTIL:'2000-01-01T00:00:00.000Z'},
      {INSTAGRAM_REVIEWER_REPLY_UNTIL:'9999-01-01T00:00:00.000Z'}, {INSTAGRAM_REVIEWER_REPLY_UNTIL:'invalid'},
      {NODE_ENV:'production'},{INSTAGRAM_ENABLED:'false'}, {INSTAGRAM_MODE:'simulated'},
      {INSTAGRAM_PILOT_TENANT_IDS:'instagram-review'}]) {
      expect(make(extra).replyTargetAllowed('instagram-meta-review','123','456')).toBe(false)
    }
  })
})
