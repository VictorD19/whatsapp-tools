import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '@shared/decorators/current-user.decorator'
import { PrismaService } from '@core/database/prisma.service'
import { RedisService } from '@core/redis/redis.service'

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
}
