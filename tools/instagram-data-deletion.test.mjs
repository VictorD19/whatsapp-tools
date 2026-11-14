import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { validateScope, validatePlan, clearPendingAuthorizations } from './instagram-data-deletion.mjs'

test('refuses scopes outside the lab and expired or malformed confirmations', () => {
  assert.throws(() => validateScope({ tenantId: 'production', accountId: 'a' }))
  assert.throws(() => validateScope({ tenantId: 'instagram-lab', accountId: '../../other' }))
  assert.throws(() => validateScope({ tenantId: 'instagram-lab', accountId: 'a', participantId: 'someone' }))
  const plan = { version: 1, requestId: randomUUID(), scope: { tenantId: 'instagram-lab', accountId: 'a' }, createdAt: Date.now(), snapshot: 'a'.repeat(64) }
  validatePlan(plan)
  assert.throws(() => validatePlan(plan, plan.createdAt + 900001))
  assert.throws(() => validatePlan({ ...plan, snapshot: 'invalid' }))
})
test('cancels only pending Instagram logins belonging to the requested tenant', async () => {
  const values = new Map([['instagram:oauth:a', JSON.stringify({ tenantId: 'instagram-lab' })],
    ['instagram:oauth:b', JSON.stringify({ tenantId: 'instagram-other' })], ['instagram:oauth:c', 'invalid']])
  const redis = { scan: async () => ['0', [...values.keys()]], get: async key => values.get(key), del: async key => Number(values.delete(key)) }
  assert.equal(await clearPendingAuthorizations(redis, 'instagram-lab'), 1)
  assert.ok(values.has('instagram:oauth:b')); assert.ok(values.has('instagram:oauth:c'))
})
