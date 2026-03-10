import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaService } from './database/prisma.service'
import { RedisService } from './redis/redis.service'
import { LoggerService } from './logger/logger.service'
import { QueueModule } from './queue/queue.module'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { GlobalExceptionFilter } from './errors/global-exception.filter'
import { ResponseInterceptor } from './interceptors/response.interceptor'
import { LoggingInterceptor } from './interceptors/logging.interceptor'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { TenantGuard } from './guards/tenant.guard'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 120 },  // 120 req/min global
    ]),
  ],
  providers: [
    PrismaService,
    RedisService,
    LoggerService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [
    PrismaService,
    RedisService,
    LoggerService,
  ],
})
export class CoreModule {}
