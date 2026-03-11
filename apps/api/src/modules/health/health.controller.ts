import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '@shared/decorators/current-user.decorator'
import { PrismaService } from '@core/database/prisma.service'
import { RedisService } from '@core/redis/redis.service'
import * as Sentry from '@sentry/node'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @Public()
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  @Public()
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      await this.redis.getClient().ping()
      return { status: 'ready', timestamp: new Date().toISOString() }
    } catch {
      throw new ServiceUnavailableException('Service not ready')
    }
  }

  // ─── ROTAS TEMPORÁRIAS DE TESTE DE ERRO ────────────────────────────────────

  /** GET /health/debug/error-500
   *  Dispara um erro 500 não tratado → capturado pelo GlobalExceptionFilter → Sentry */
  @Get('debug/error-500')
  @Public()
  debugError500() {
    throw new Error('[DEBUG] Erro 500 intencional para teste do Sentry (backend)')
  }

  /** GET /health/debug/sentry-capture
   *  Captura manual via Sentry.captureException → útil para testar envio sem lançar exceção HTTP */
  @Get('debug/sentry-capture')
  @Public()
  debugSentryCapture() {
    const err = new Error('[DEBUG] Captura manual Sentry (backend)')
    Sentry.captureException(err, {
      tags: { source: 'debug-route' },
      extra: { note: 'Rota temporária de teste — remover após validação' },
    })
    return {
      status: 'captured',
      message: 'Erro enviado ao Sentry via captureException',
      timestamp: new Date().toISOString(),
    }
  }
}
