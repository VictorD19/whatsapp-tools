import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileOnce, localRequest, INTERVAL, ERROR_PAUSE } from './instagram-lab-reconcile.mjs'

function fixture() {
  const state = { version: 1, attempts: [], nextAttemptAt: 0 }
  const calls = [], saved = []
  const responses = {
    'auth/login': { accessToken: 'local-test-token', user: { tenant: { id: 'instagram-lab' }, role: 'admin', isSuperAdmin: false } },
    'instagram/status': { enabled: true, mode: 'meta', testOnly: true, realSendingEnabled: false },
    'instagram/accounts': [{ id: 'lab-account', username: 'joaobosco.pro', instagramId: '17841400699000476', mode: 'meta', active: true }],
    'instagram/accounts/lab-account/sync': { synchronized: true, processed: 2 },
  }
  const request = async (path, method, body, token) => {
    assert.ok(saved.length, 'budget must be persisted before any request')
    calls.push({ path, method, token })
    if (!(path in responses)) throw new Error('unexpected request')
    return responses[path]
  }
  const options = { state, now: 10_000_000, request, password: 'private-local-password', save: async s => saved.push(structuredClone(s)) }
  return { state, calls, responses, saved, options }
}

test('recovers only the approved account through sync, never reply, and never persists credentials', async () => {
  const f = fixture()
  const result = await reconcileOnce(f.options)
  assert.equal(result.mode, 'api_reconciliation')
  assert.equal(result.processed, 2)
  assert.deepEqual(f.calls.map(c => c.path), ['auth/login', 'instagram/status', 'instagram/accounts', 'instagram/accounts/lab-account/sync'])
  assert.equal(f.calls.at(-1).method, 'POST')
  assert.equal(f.state.nextAttemptAt, f.options.now + INTERVAL)
  assert.ok(!JSON.stringify(f.saved).includes('token'))
  assert.ok(!JSON.stringify(f.saved).includes('password'))
})

test('a restart preserves the five-minute cooldown without contacting the API', async () => {
  const f = fixture()
  await reconcileOnce(f.options)
  const calls = f.calls.length
  const result = await reconcileOnce({ ...f.options, state: structuredClone(f.state), now: f.options.now + 1000 })
  assert.equal(result.skipped, true)
  assert.equal(f.calls.length, calls)
})

test('the rolling hourly budget prevents a thirteenth attempt', async () => {
  const f = fixture()
  f.state.attempts = Array.from({ length: 12 }, (_, i) => f.options.now - 60_000 * (i + 1))
  const result = await reconcileOnce(f.options)
  assert.equal(result.skipped, true)
  assert.equal(f.calls.length, 0)
  assert.ok(f.state.nextAttemptAt > f.options.now)
})

test('an unrelated tenant cannot reach status, accounts or provider synchronization', async () => {
  const f = fixture()
  f.responses['auth/login'].user.tenant.id = 'production-tenant'
  assert.equal((await reconcileOnce(f.options)).mode, 'error_paused')
  assert.equal(f.calls.length, 1)
})

test('real sending enabled stops before looking up accounts', async () => {
  const f = fixture()
  f.responses['instagram/status'].realSendingEnabled = true
  assert.equal((await reconcileOnce(f.options)).mode, 'error_paused')
  assert.equal(f.calls.length, 2)
})

test('a revoked or different account cannot be synchronized', async () => {
  for (const change of [{ active: false }, { instagramId: 'other' }, { username: 'other' }]) {
    const f = fixture()
    Object.assign(f.responses['instagram/accounts'][0], change)
    assert.equal((await reconcileOnce(f.options)).mode, 'error_paused')
    assert.equal(f.calls.length, 3)
  }
})

test('provider errors pause for thirty minutes and never expose the provider response', async () => {
  const f = fixture()
  delete f.responses['instagram/accounts/lab-account/sync']
  const result = await reconcileOnce(f.options)
  assert.equal(result.mode, 'error_paused')
  assert.equal(result.nextAttemptAt, f.options.now + ERROR_PAUSE)
  assert.equal(f.state.lastErrorStage, 'sync')
  assert.ok(!JSON.stringify(f.state).includes('unexpected request'))
})

test('server cooldown is respected without an immediate retry', async () => {
  const f = fixture()
  f.responses['instagram/accounts/lab-account/sync'] = { synchronized: false, processed: 0, retryAfterSeconds: 90 }
  assert.equal((await reconcileOnce(f.options)).mode, 'server_cooldown')
  assert.equal(f.calls.length, 4)
  assert.equal(f.state.nextAttemptAt, f.options.now + INTERVAL)
})

test('invalid or future persisted budget fails closed before requests', async () => {
  const f = fixture()
  f.state.attempts = [f.options.now + 1]
  await assert.rejects(reconcileOnce(f.options), /Invalid reconciliation state/)
  assert.equal(f.calls.length, 0)
})

test('external and outbound routes are rejected before fetch', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch') })
  await assert.rejects(localRequest('https://sistemazapchat.com/api/v1/instagram/accounts'), /Route outside/)
  await assert.rejects(localRequest('instagram/conversations/a/reply', 'POST', {}), /Route outside/)
  assert.equal(fetchMock.mock.calls.length, 0)
})
