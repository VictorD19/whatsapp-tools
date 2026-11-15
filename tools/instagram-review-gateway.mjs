// HTTPS terminates at Cloudflare. Only the isolated reviewer instance is reachable.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

export function reviewRoute(method, path) {
  if (/%2f|%5c/i.test(path)) return null
  try { path = decodeURIComponent(path) } catch { return null }
  if (path.includes('..') || /[%\\\x00]|\.map$/i.test(path)) return null
  if (method === 'POST' && ['/api/v1/auth/login', '/api/v1/auth/refresh'].includes(path)) return 'api'
  if (path.startsWith('/api/')) {
    if (method === 'GET' && /^\/api\/v1\/instagram\/(status|accounts|connect|callback|webhook)$/.test(path)) return 'api'
    if (method === 'POST' && path === '/api/v1/instagram/webhook') return 'api'
    if (method === 'GET' && /^\/api\/v1\/instagram\/(accounts\/[\w-]+\/conversations|conversations\/[\w-]+\/messages)$/.test(path)) return 'api'
    if (method === 'POST' && /^\/api\/v1\/instagram\/(simulated-account|simulate-inbound|messages\/[\w-]+\/simulate-cancellation)$/.test(path)) return 'api'
    if (method === 'DELETE' && /^\/api\/v1\/instagram\/accounts\/[\w-]+$/.test(path)) return 'api'
    return null // No registration, administration, arbitrary proxy, sync or real replies.
  }
  if (['GET', 'HEAD'].includes(method) && (['/', '/inbox', '/login', '/instagram', '/privacy', '/terms', '/data-deletion', '/favicon.ico', '/favicon.svg', '/favicon-32x32.png', '/favicon-96x96.png', '/apple-touch-icon.png'].includes(path) || (path.startsWith('/_next/static/') && path.split('/').every(segment => /^[a-zA-Z0-9_.()[\]@~-]*$/.test(segment))))) return 'web'
  return null
}

export function createReviewGateway({ api = 'http://127.0.0.1:18011', web = 'http://127.0.0.1:18091' } = {}) {
  if (api !== 'http://127.0.0.1:18011' || web !== 'http://127.0.0.1:18091') throw Error('Reviewer upstreams are fixed')
  const attempts = new Map()
  const hosts = new Set(['instagram-review.sistemazapchat.com', 'localhost:18012', '127.0.0.1:18012'])
  return createServer(async (req, res) => {
    const deny = status => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }); res.end('Indisponível') }
    try {
      if (!hosts.has(req.headers.host)) return deny(404)
      const url = new URL(req.url, 'http://localhost')
      const target = reviewRoute(req.method, url.pathname)
      if (!target) return deny(404)
      if (['GET', 'HEAD'].includes(req.method) && ['/', '/inbox'].includes(url.pathname)) {
        res.writeHead(302, { Location: url.pathname === '/' ? '/login' : '/instagram', 'Cache-Control': 'no-store' }); return res.end()
      }
      if (req.headers.origin && !['https://instagram-review.sistemazapchat.com', 'http://localhost:18012', 'http://127.0.0.1:18012'].includes(req.headers.origin)) return deny(403)
      if (url.pathname === '/api/v1/auth/login') {
        const key = String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress)
        const now = Date.now(), prior = attempts.get(key)
        const item = prior && now - prior.at < 60000 ? prior : { at: now, count: 0 }
        if (++item.count > 10) return deny(429)
        if (attempts.size > 1000) for (const [k, value] of attempts) if (now - value.at > 60000) attempts.delete(k)
        if (attempts.size > 1000 && !attempts.has(key)) return deny(429)
        attempts.set(key, item)
      }
      let body = Buffer.alloc(0)
      const limit = url.pathname.endsWith('/webhook') ? 1048576 : 65536
      for await (const chunk of req) { if (body.length + chunk.length > limit) return deny(413); body = Buffer.concat([body, chunk]) }
      const headers = {}
      for (const name of ['authorization', 'content-type', 'x-hub-signature-256', 'accept', 'accept-language', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-url']) if (typeof req.headers[name] === 'string') headers[name] = req.headers[name]
      const upstream = target === 'api' ? api : web
      const response = await fetch(upstream + url.pathname + url.search, { method: req.method, headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : body, redirect: 'manual', signal: AbortSignal.timeout(20000) })
      if (response.status >= 500) return deny(502)
      const result = Buffer.from(await response.arrayBuffer())
      if (result.length > 10 * 1024 * 1024) return deny(502)
      const output = { 'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }
      if (response.headers.has('location')) {
        const location = response.headers.get('location')
        if (!location.startsWith('/') || location.startsWith('//')) return deny(502)
        output.Location = location
      }
      res.writeHead(response.status, output); res.end(result)
    } catch { if (!res.headersSent) deny(502); else res.end() }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createReviewGateway().listen(18012, '127.0.0.1', () => console.log('Reviewer gateway ready on loopback18012; no tunnel enabled by this process.'))
}
