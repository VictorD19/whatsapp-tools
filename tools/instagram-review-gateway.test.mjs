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
  assert.equal(reviewRoute('POST', '/api/v1/instagram/webhook'), 'api')
})
test('blocks registration, administration, debugging, source maps, replies and history pulls', () => {
  for (const [m,p] of [['POST','/api/v1/auth/register'],['POST','/api/v1/instagram/conversations/x/reply'],['POST','/api/v1/instagram/accounts/x/sync'],['GET','/api/docs'],['GET','/api/v1/admin/tenants'],['GET','/.env'],['GET','/_next/static/secret.js.map'],['GET','/__nextjs_source-map'],['GET','/_next/static/../server'],['GET','/api/v1/instagram/accounts/x%2Fadmin/conversations']]) assert.equal(reviewRoute(m,p),null)
})
test('refuses a different local or production upstream', () => {
  assert.throws(()=>createReviewGateway({api:'https://sistemazapchat.com'}))
  assert.throws(()=>createReviewGateway({api:'http://127.0.0.1:18001'}))
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
