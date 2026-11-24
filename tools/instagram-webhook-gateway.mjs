// Optional local gateway for an HTTPS tunnel. Never forwards CRM/admin endpoints.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

export function createInstagramGateway(upstream = 'http://127.0.0.1:18001') {
  // Fix the destination to the local lab; never accept a production/upstream URL.
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(upstream)) throw new Error('Destino precisa ser a API local do laboratório')
  return createServer(async (request, response) => {
    const deny = (status) => { response.writeHead(status, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); response.end('Indisponível') }
    try {
      const url = new URL(request.url, 'http://localhost')
      const callback = url.pathname === '/api/v1/instagram/callback' && request.method === 'GET'
      const webhook = url.pathname === '/api/v1/instagram/webhook' && ['GET', 'POST'].includes(request.method)
      if (!callback && !webhook) return deny(404)
      let body = Buffer.alloc(0)
      for await (const chunk of request) {
        if (body.length + chunk.length > 1024 * 1024) return deny(413)
        body = Buffer.concat([body, chunk])
      }
      const headers = {}
      for (const name of ['content-type', 'x-hub-signature-256']) {
        if (typeof request.headers[name] === 'string') headers[name] = request.headers[name]
      }
      const result = await fetch(upstream + url.pathname + url.search, { method: request.method, headers,
        body: request.method === 'POST' ? body : undefined, redirect: 'error', signal: AbortSignal.timeout(15000) })
      response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') || 'text/plain', 'Cache-Control': 'no-store' })
      response.end(Buffer.from(await result.arrayBuffer()))
    } catch { if (!response.headersSent) deny(502); else response.end() }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createInstagramGateway().listen(18002, '127.0.0.1', () => {
    console.log('Gateway local 127.0.0.1:18002: somente callback OAuth e webhook Instagram. Nenhum túnel público foi iniciado.')
  })
}
