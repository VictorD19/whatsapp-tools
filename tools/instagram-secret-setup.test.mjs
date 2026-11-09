import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request as httpRequest } from 'node:http'
import { createSecretSetup } from './instagram-secret-setup.mjs'

test('secret form requires local origin and nonce; stores privately without echoing credential', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'instagram-secret-')), file = join(dir, 'meta.json')
  writeFileSync(file, JSON.stringify({ appId: '123', sendEnabled: false }))
  // A fixed origin is intentional; Host and Origin are part of the boundary.
  const origin = 'http://localhost:18003', server = createSecretSetup(file, origin)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = `http://127.0.0.1:${server.address().port}`
  const request = (method = 'GET', headers = {}, body = '') => new Promise((resolve, reject) => {
    const req = httpRequest(address, { method, headers }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString() }))
    }); req.on('error', reject); req.end(body.toString())
  })
  try {
    assert.equal((await request()).status, 404)
    const page = (await request('GET', { Host: 'localhost:18003' })).text
    const nonce = page.match(/name="nonce" value="([a-f0-9]+)"/)[1], secret = 'a'.repeat(32)
    const body = new URLSearchParams({ nonce, appSecret: secret })
    assert.equal((await request('POST', { Host: 'localhost:18003', Origin: 'https://other.example' }, body)).status, 403)
    const saved = await request('POST', { Host: 'localhost:18003', Origin: origin }, body)
    assert.equal(saved.status, 200); assert.ok(!saved.text.includes(secret))
    assert.equal(JSON.parse(readFileSync(file)).appSecret, secret)
    assert.equal(JSON.parse(readFileSync(file)).sendEnabled, false)
    assert.equal(statSync(file).mode & 0o777, 0o600)
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true }) }
})
