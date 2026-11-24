import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createInstagramGateway } from './instagram-webhook-gateway.mjs'

test('gateway exposes only callback/webhook, preserving signed bytes and stripping credentials', async () => {
  const received = []
  const upstream = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk)
    received.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() })
    res.end('ok')
  })
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  const gateway = createInstagramGateway(`http://127.0.0.1:${upstream.address().port}`)
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${gateway.address().port}`
  try {
    for (const path of ['/api/v1/auth/login', '/api/v1/instagram/accounts', '/login']) assert.equal((await fetch(base + path)).status, 404)
    assert.equal((await fetch(base + '/api/v1/instagram/callback?code=test&state=test')).status, 200)
    const body = '{ "object": "instagram", "entry": [] }'
    assert.equal((await fetch(base + '/api/v1/instagram/webhook', { method: 'POST', body,
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'signed', Authorization: 'Bearer do-not-forward', Cookie: 'do-not-forward' } })).status, 200)
    assert.equal(received[1].body, body)
    assert.equal(received[1].headers['x-hub-signature-256'], 'signed')
    assert.equal(received[1].headers.authorization, undefined)
    assert.equal(received[1].headers.cookie, undefined)
    assert.equal(received.length, 2)
  } finally { await Promise.all([new Promise(resolve => gateway.close(resolve)), new Promise(resolve => upstream.close(resolve))]) }
})

test('gateway rejects a remote destination', () => {
  assert.throws(() => createInstagramGateway('https://sistemazapchat.com'), /local/)
})
