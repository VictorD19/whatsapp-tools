import { Test } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import compress from '@fastify/compress'
import { ConfigService } from '@nestjs/config'
import { GlobalExceptionFilter } from '@core/errors/global-exception.filter'
import { InstagramController } from './instagram.controller'
import { InstagramConfig } from './instagram.config'
import { InstagramService } from './instagram.service'

describe('Instagram webhook verification over HTTP', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const values: Record<string, string> = {
      NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_VERIFY_TOKEN: 'local-test-only',
    }
    const config = new InstagramConfig({ get: (key: string, fallback: string) => values[key] ?? fallback } as ConfigService)
    const service = new InstagramService(null as any, null as any, null as any, config, null as any)
    const module = await Test.createTestingModule({
      controllers: [InstagramController], providers: [{ provide: InstagramService, useValue: service }],
    }).compile()
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.register(compress, { global: true })
    app.useGlobalFilters(new GlobalExceptionFilter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => { await app?.close() })

  it('returns JSON 403 for an invalid token instead of a text/plain serialization failure', async () => {
    const response = await app.inject({ method: 'GET', url: '/instagram/webhook?hub.mode=subscribe&hub.challenge=123&hub.verify_token=wrong' })
    expect(response.statusCode).toBe(403)
    expect(response.headers['content-type']).toContain('application/json')
    expect(response.json().message).toBe('Verificação inválida')
  })

  it('returns the exact plain-text challenge for a valid verification', async () => {
    const response = await app.inject({ method: 'GET', url: '/instagram/webhook?hub.mode=subscribe&hub.challenge=000123&hub.verify_token=local-test-only' })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/plain')
    expect(response.body).toBe('000123')
  })
  it('acknowledges a retained OAuth grant with UTF-8 HTTP202 and no credentials', async () => {
    const service = app.get(InstagramService)
    const callback = jest.spyOn(service, 'callback').mockResolvedValueOnce({ pending: true, retryAfterSeconds: 300 })
    try {
      const response = await app.inject({ method: 'GET', url: '/instagram/callback?code=private-code&state=private-state' })
      expect(response.statusCode).toBe(202)
      expect(response.headers['content-type']).toContain('charset=utf-8')
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.body).toContain('automaticamente')
      expect(response.body).not.toMatch(/private-code|private-state/)
    } finally { callback.mockRestore() }
  })
  it('does not expose provider errors on a failed OAuth callback', async () => {
    const callback = jest.spyOn(app.get(InstagramService), 'callback').mockRejectedValueOnce(new Error('private-provider-error'))
    try {
      const response = await app.inject({ method: 'GET', url: '/instagram/callback?code=private-code&state=private-state' })
      expect(response.statusCode).toBe(400)
      expect(response.body).not.toMatch(/private-code|private-state|private-provider-error/)
    } finally { callback.mockRestore() }
  })
})
