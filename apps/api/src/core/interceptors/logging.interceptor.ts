import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { LoggerService } from '@core/logger/logger.service'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest()
    const { method, url } = req
    const start = Date.now()

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start
        this.logger.log(`${method} ${url} — ${ms}ms`, 'HTTP')
      }),
    )
  }
}
