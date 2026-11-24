import test from 'node:test'
import assert from 'node:assert/strict'
import { request } from 'node:http'
import { reviewRoute, createReviewGateway } from './instagram-review-gateway.mjs'
test('exposes only the reviewer website and intended Instagram/auth routes', () => {
  for (const p of ['/login', '/instagram', '/privacy', '/_next/static/chunks/app.js']) assert.equal(reviewRoute('GET', p), 'web')
  assert.equal(reviewRoute('GET', '/_next/static/chunks/app/%28auth%29/login/page-123.js'), 'web')
  assert.equal(reviewRoute('GET', '/_next/static/%252e%252e/server.js'), null)
  assert.equal(reviewRoute('POST', '/api/v1/auth/login'), 'api')
  assert.equal(reviewRoute('GET', '/api/v1/instagram/connect'), 'api')
  assert.equal(reviewRoute('GET', '/api/v1/instagram/connection'), 'api')
  assert.equal(reviewRoute('POST', '/api/v1/instagram/connection/retry'), 'api')
  assert.equal(reviewRoute('DELETE', '/api/v1/instagram/connection'), 'api')
  assert.equal(reviewRoute('DELETE', '/api/v1/instagram/messages/own-message'), 'api')
  assert.equal(reviewRoute('POST', '/api/v1/instagram/webhook'), 'api')
})
test('blocks registration, administration, debugging, source maps, replies and history pulls', () => {
  for (const [m,p] of [['POST','/api/v1/auth/register'],['POST','/api/v1/instagram/conversations/x/reply'],['POST','/api/v1/instagram/accounts/x/sync'],['GET','/api/docs'],['GET','/api/v1/admin/tenants'],['GET','/.env'],['GET','/_next/static/secret.js.map'],['GET','/__nextjs_source-map'],['GET','/_next/static/../server'],['GET','/api/v1/instagram/accounts/x%2Fadmin/conversations']]) assert.equal(reviewRoute(m,p),null)
  assert.equal(reviewRoute('DELETE', '/api/v1/instagram/messages/own%2Fother'), null)
  assert.equal(reviewRoute('DELETE', '/api/v1/instagram/messages'), null)
})
test('refuses a different local or production upstream', () => {
  assert.throws(()=>createReviewGateway({api:'https://sistemazapchat.com'}))
  assert.throws(()=>createReviewGateway({api:'http://127.0.0.1:18001'}))
})
test('reply gateway fails closed unless the owner demonstration has an explicit valid scope', async () => {
  for (const replyEnvironment of [
    { INSTAGRAM_SEND_ENABLED: 'true' },
    { INSTAGRAM_SEND_ENABLED: 'true', INSTAGRAM_CONTROLLED_REPLY_SCOPE: '{' },
    { INSTAGRAM_SEND_ENABLED: 'true', INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify({ tenantId: 'instagram-meta-review', instagramId: '123', participantId: '456' }) },
  ]) assert.throws(() => createReviewGateway({ replyEnvironment }))
  assert.equal(reviewRoute('POST', '/api/v1/instagram/conversations/x/reply', 'true'), null)
  assert.equal(reviewRoute('POST', '/api/v1/instagram/conversations/x/reply', true), 'api')
  assert.equal(reviewRoute('POST', '/api/v1/instagram/conversations/x%2Fy/reply', true), null)
  assert.equal(reviewRoute('POST', '/api/v1/instagram/accounts/x/sync', true), null)
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (url, options) => {
    calls++
    assert.equal(url, 'http://127.0.0.1:18011/api/v1/instagram/conversations/x/reply')
    assert.equal(options.headers.authorization, 'Bearer test-only')
    // Authentication, tenant/recipient checks and the 24h window remain in the API.
    return new Response('Denied by API', { status: 403 })
  }
  try {
    for (const enabled of [false, true]) {
      const gateway = createReviewGateway({ replyEnvironment: enabled ? {
        INSTAGRAM_SEND_ENABLED: 'true', INSTAGRAM_CONTROLLED_REPLY_SCOPE: JSON.stringify({ tenantId: 'instagram-review', instagramId: '123', participantId: '456' }),
      } : {} })
      await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve))
      try {
        const status = await new Promise((resolve, reject) => {
          const req = request({ host: '127.0.0.1', port: gateway.address().port,
            path: '/api/v1/instagram/conversations/x/reply', method: 'POST',
            headers: { Host: 'instagram-review.sistemazapchat.com', Authorization: 'Bearer test-only', 'Content-Type': 'application/json' } }, res => {
            res.resume(); res.once('end', () => resolve(res.statusCode))
          })
          req.once('error', reject); req.end('{}')
        })
        assert.equal(status, enabled ? 403 : 404)
      } finally { await new Promise(resolve => gateway.close(resolve)) }
    }
    assert.equal(calls, 1)
  } finally { globalThis.fetch = originalFetch }
})
test('rejects hostile hosts, foreign origins and restricted routes before contacting an upstream', async () => {
  const gateway = createReviewGateway()
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve))
  const port = gateway.address().port
  const status = (path, headers) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, headers }, res => {
      res.resume(); res.once('end', () => resolve(res.statusCode))
    })
    req.once('error', reject); req.end()
  })
  try {
    assert.equal(await status('/login', { Host: 'untrusted.example' }), 404)
    assert.equal(await status('/login', { Host: 'instagram-review.sistemazapchat.com', Origin: 'https://untrusted.example' }), 403)
    assert.equal(await status('/api/v1/admin/tenants', { Host: 'instagram-review.sistemazapchat.com' }), 404)
    assert.equal(await status('/', { Host: 'instagram-review.sistemazapchat.com' }), 302)
  } finally { await new Promise(resolve => gateway.close(resolve)) }
})
test('returns successful OAuth to the fixed pilot panel without leaking grant parameters; retains pending/errors', async () => {
  const originalFetch = globalThis.fetch
  let upstreamStatus = 200
  globalThis.fetch = async () => new Response('Safe upstream status', { status: upstreamStatus, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  const gateway = createReviewGateway()
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve))
  const port = gateway.address().port
  const call = () => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/api/v1/instagram/callback?code=private-code&state=private-state&return=https://untrusted.example', headers: { Host: 'instagram-review.sistemazapchat.com' } }, res => {
      let body = ''; res.on('data', chunk => { body += chunk }); res.once('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    }); req.once('error', reject); req.end()
  })
  try {
    const success = await call()
    assert.equal(success.status, 303)
    assert.equal(success.headers.location, '/instagram#conexao')
    assert.equal(success.headers['referrer-policy'], 'no-referrer')
    assert.equal(success.headers['cache-control'], 'no-store')
    assert.doesNotMatch(JSON.stringify(success), /private-code|private-state|untrusted/)
    for (const status of [202, 400]) {
      upstreamStatus = status
      const retained = await call()
      assert.equal(retained.status, status)
      assert.equal(retained.headers.location, undefined)
      assert.equal(retained.body, 'Safe upstream status')
    }
  } finally {
    globalThis.fetch = originalFetch
    await new Promise(resolve => gateway.close(resolve))
  }
})

test('reviewer reply route expires dynamically without opening history or registration',async()=>{
 const original=globalThis.fetch;let calls=0
 globalThis.fetch=async()=>{calls++;return new Response('API still checks tenant ownership',{status:403})}
 const deadline=new Date(Math.floor((Date.now()+3600000)/1000)*1000).toISOString()
 const gateway=createReviewGateway({replyEnvironment:{INSTAGRAM_REVIEWER_REPLY_UNTIL:deadline}})
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve))
 const realNow=Date.now
 const status=path=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port:gateway.address().port,path,method:'POST',headers:{Host:'instagram-review.sistemazapchat.com'}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end('{}')})
 try{
  assert.equal(await status('/api/v1/instagram/conversations/owned/reply'),403)
  assert.equal(await status('/api/v1/instagram/accounts/owned/sync'),404)
  assert.equal(await status('/api/v1/auth/register'),404)
  Date.now=()=>Date.parse(deadline)+1000
  assert.equal(await status('/api/v1/instagram/conversations/owned/reply'),404)
  assert.equal(calls,1)
 }finally{Date.now=realNow;globalThis.fetch=original;await new Promise(resolve=>gateway.close(resolve))}
 assert.throws(()=>createReviewGateway({replyEnvironment:{INSTAGRAM_REVIEWER_REPLY_UNTIL:'invalid'}}))
})
