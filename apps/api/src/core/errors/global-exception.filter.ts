import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto'
import * as Sentry from '@sentry/node'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    // Reporta ao Sentry e loga no console para erros inesperados (não erros de negócio HTTP 4xx)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} — ${(exception as Error)?.message ?? 'Unknown error'}`,
        (exception as Error)?.stack,
      )
      Sentry.captureException(exception, {
        extra: {
          url: request.url,
          method: request.method,
          requestId: (request.headers['x-request-id'] as string) ?? randomUUID(),
        },
      })
    }

    const isAppException = exception instanceof HttpException
    const body = isAppException
      ? (exception.getResponse() as Record<string, unknown>)
      : {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message:
              process.env.NODE_ENV === 'production'
                ? 'Erro interno do servidor'
                : (exception as Error)?.message ?? 'Unknown error',
            details: null,
          },
        }

    reply.status(status).send({
      ...body,
      timestamp: new Date().toISOString(),
      requestId: (request.headers['x-request-id'] as string) ?? randomUUID(),
      path: request.url,
    })
  }
}
