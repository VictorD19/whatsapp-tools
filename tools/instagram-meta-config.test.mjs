import test from 'node:test'
import assert from 'node:assert/strict'
import { metaTemplate, metaDiagnostics, metaEnvironment } from './instagram-meta-config.mjs'

const configured = () => ({ appId: '123', appSecret: 'test-secret', verifyToken: 'x'.repeat(32),
  apiVersion: 'v99.0', redirectUri: 'https://instagram-test.example/api/v1/instagram/callback', sendEnabled: false })

test('template cannot enable Meta or real sending', () => {
  assert.equal(metaTemplate().sendEnabled, false)
  assert.ok(metaDiagnostics(metaTemplate()).length)
  assert.throws(() => metaEnvironment(metaTemplate()), /incompleta/)
})
test('validated config enables Meta while preserving real-send default off', () => {
  assert.deepEqual(metaDiagnostics(configured()), [])
  assert.equal(metaEnvironment(configured()).INSTAGRAM_MODE, 'meta')
  assert.equal(metaEnvironment(configured()).INSTAGRAM_SEND_ENABLED, 'false')
  assert.equal('DATABASE_URL' in metaEnvironment(configured()), false)
})
test('rejects malformed, local, insecure or credential-bearing callback URLs', () => {
  for (const redirectUri of ['http://instagram-test.example/api/v1/instagram/callback', 'https://localhost/api/v1/instagram/callback',
    'https://user:password@instagram-test.example/api/v1/instagram/callback', 'https://instagram-test.example/other',
    'https://instagram-test.example/api/v1/instagram/callback?secret=1']) {
    assert.ok(metaDiagnostics({ ...configured(), redirectUri }).some(p => p.includes('Callback')))
  }
})
test('diagnostics do not expose secrets or copy arbitrary environment fields', () => {
  const config = { ...configured(), appId: '', DATABASE_URL: 'production-do-not-use' }
  assert.ok(!metaDiagnostics(config).join().includes(config.appSecret))
  assert.equal('DATABASE_URL' in metaEnvironment({ ...config, appId: '123' }), false)
})
