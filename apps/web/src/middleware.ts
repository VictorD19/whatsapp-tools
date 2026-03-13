import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware de segurança
 *
 * Mitiga CVE-2025-29927: bypass de middleware via header x-middleware-subrequest
 * https://nextjs.org/blog/cve-2025-29927
 *
 * O Next.js 15.2.3+ já faz o patch internamente, mas essa camada extra
 * bloqueia tentativas que passem por proxies/CDN antes de chegar ao Next.js.
 */

const BLOCKED_INTERNAL_HEADERS = [
  'x-middleware-subrequest',
  'x-middleware-subrequest-id',
  'x-invoke-path',
  'x-invoke-query',
  'x-invoke-output',
  'x-invoke-status',
  'x-middleware-invoke',
]

export function middleware(request: NextRequest) {
  // Bloquear requisições com headers internos do Next.js vindos de fora
  for (const header of BLOCKED_INTERNAL_HEADERS) {
    if (request.headers.has(header)) {
      return new NextResponse(null, { status: 400 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
