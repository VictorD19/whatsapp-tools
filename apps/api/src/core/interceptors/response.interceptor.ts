import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface ResponseEnvelope<T> {
  data: T
  meta?: Record<string, unknown>
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((result) => {
        // Se já vier no formato { data, meta }, não encapsula de novo
        if (result && typeof result === 'object' && 'data' in result) {
          return result as ResponseEnvelope<T>
        }
        return { data: result }
      }),
    )
  }
}
