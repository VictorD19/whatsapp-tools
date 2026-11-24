import test from 'node:test'
import assert from 'node:assert/strict'
import policy from '../infra/instagram-host/reply-policy.cjs'

const scope = { tenantId: 'instagram-review', instagramId: '123', participantId: '456' }
test('host keeps existing deployments disabled and refuses ambiguous activation', () => {
  assert.deepEqual(policy.controlledReplyEnvironment({ sendEnabled: false }), { INSTAGRAM_SEND_ENABLED: 'false' })
  for (const meta of [undefined, {}, { sendEnabled: 'true' }, { sendEnabled: true },
    { sendEnabled: false, controlledReplyScope: scope },
    ...[null, [], {}, { ...scope, tenantId: 'instagram-meta-review' },
      { ...scope, tenantId: 'production' }, { ...scope, instagramId: '456' },
      { ...scope, participantId: 456 }, { ...scope, participantId: 'x' },
      { ...scope, participantId: '1'.repeat(41) }, { ...scope, extra: true }]
      .map(controlledReplyScope => ({ sendEnabled: true, controlledReplyScope }))]) {
    assert.throws(() => policy.controlledReplyEnvironment(meta))
  }
})
test('host passes exactly the explicitly scoped owner demonstration to both guarded processes', () => {
  assert.deepEqual(policy.controlledReplyEnvironment({ sendEnabled: true, controlledReplyScope: scope }), {
    INSTAGRAM_SEND_ENABLED: 'true', INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify(scope),
  })
})

test('reviewer replies are a separate expiring opt-in with the owner send flag off',()=>{
 const until=new Date(Math.floor((Date.now()+3600000)/1000)*1000).toISOString()
 assert.deepEqual(policy.controlledReplyEnvironment({sendEnabled:false,reviewerReplyUntil:until}),
  {INSTAGRAM_SEND_ENABLED:'false',INSTAGRAM_REVIEWER_REPLY_UNTIL:until})
 for(const reviewerReplyUntil of [null,true,0,'','invalid','9999-01-01T00:00:00.000Z'])
  assert.throws(()=>policy.controlledReplyEnvironment({sendEnabled:false,reviewerReplyUntil}))
 assert.throws(()=>policy.controlledReplyEnvironment({sendEnabled:true,controlledReplyScope:scope,reviewerReplyUntil:until}))
 assert.doesNotThrow(()=>policy.controlledReplyEnvironment({sendEnabled:false,reviewerReplyUntil:'2000-01-01T00:00:00.000Z'}))
})
