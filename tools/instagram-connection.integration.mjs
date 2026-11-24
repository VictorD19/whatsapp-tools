// Real Redis transaction/TTL/lock check on an unused DB of the isolated reviewer, with fixtures only.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(resolve('apps/api/package.json'))
require('reflect-metadata')
require('tsconfig-paths').register({ baseUrl: resolve('apps/api/dist'), paths: { '@core/*': ['core/*'], '@shared/*': ['shared/*'] } })
const Redis = require('ioredis')
const redis = new Redis('redis://127.0.0.1:26379/15', { maxRetriesPerRequest: 1 })
const { ConfigService } = require('@nestjs/config')
const { AesCryptoService } = require(resolve('apps/api/dist/shared/crypto/aes-crypto.service'))
const { InstagramConfig } = require(resolve('apps/api/dist/modules/instagram/instagram.config'))
const { InstagramConnectionManager } = require(resolve('apps/api/dist/modules/instagram/instagram.connection'))
const { InstagramTransportError } = require(resolve('apps/api/dist/modules/instagram/instagram.adapter'))
const config = new ConfigService({ NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'meta', INSTAGRAM_PILOT_TENANT_IDS: 'fixture',
  INSTAGRAM_APP_ID: '123', INSTAGRAM_APP_SECRET: 'fixture', INSTAGRAM_CONFIG_ID: '456', INSTAGRAM_API_VERSION: 'v27.0',
  INSTAGRAM_REDIRECT_URI: 'https://test.example/callback', ENCRYPTION_KEY: 'a'.repeat(32) })
const crypto = new AesCryptoService(config), prefix = 'instagram:connection:'
let exchanged = 0, completed = 0, persisted = 0, fail = true
let ownsFixtures = false
const adapter = { exchangeToken: async () => { exchanged++; return { token: 'fixture-private-token', expiresAt: null } },
  completeConnection: async token => { completed++; if (fail) throw new InstagramTransportError(true); return { ...token, instagramId: '123', clientBusinessId: '456', username: 'fixture' } } }
const make = () => new InstagramConnectionManager({ getClient: () => redis }, crypto, new InstagramConfig(config), adapter, async () => { persisted++ }, async () => true)
const ids = JSON.stringify(['fixture', 'admin']), key = prefix + ids
try {
  assert.equal(await redis.dbsize(), 0, 'DB15 must be empty; never clear a pre-existing database')
  ownsFixtures = true
  assert.equal((await make().authorize('fixture', 'admin', 'fixture-code')).pending, true)
  const encrypted = await redis.get(key)
  assert.ok(encrypted && !encrypted.includes('fixture-private-token'))
  assert.ok(await redis.ttl(key) > 3500)
  assert.equal(await redis.zcard(prefix + 'due'), 1)
  assert.equal((await make().resume('fixture', 'admin')).pending, true)
  assert.equal(completed, 1)
  // Advance only this fixture's schedule; no provider traffic or wall-clock wait.
  const state = JSON.parse(crypto.decrypt(encrypted)); state.nextAt = Date.now() - 1
  await redis.set(key, crypto.encrypt(JSON.stringify(state)), 'EX', 3600)
  await redis.zadd(prefix + 'due', state.nextAt, ids)
  fail = false
  await make().processDue()
  assert.equal(exchanged, 1); assert.equal(completed, 2); assert.equal(persisted, 1)
  assert.equal(await redis.get(key), null); assert.equal(await redis.zcard(prefix + 'due'), 0)
  assert.equal(await redis.get(key + ':lock'), null)
  console.log(JSON.stringify({ passed: true, realRedis: true, codeExchanges: exchanged, recoveredAfterRestart: true, providerCalls: 0, messagesSent: 0 }))
} finally {
  // Only named fixture keys, never FLUSHDB and never any other Redis DB.
  if (ownsFixtures) { await redis.del(key, key + ':lock'); await redis.zrem(prefix + 'due', ids) }
  await redis.quit()
}
