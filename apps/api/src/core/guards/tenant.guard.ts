import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '@shared/decorators/current-user.decorator'
import { AppException } from '@core/errors/app.exception'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const tenantId = request.user?.tenantId

    if (!tenantId) {
      throw AppException.unauthorized('AUTH_UNAUTHORIZED', 'Tenant não identificado')
    }

    request.tenantId = tenantId
    return true
  }
}
