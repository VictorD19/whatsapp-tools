import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppException } from '@core/errors/app.exception'
import { IS_PUBLIC_KEY } from '@shared/decorators/current-user.decorator'
import { ROLES_KEY } from '@shared/decorators/roles.decorator'

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw AppException.unauthorized('AUTH_UNAUTHORIZED', 'Usuario nao autenticado')
    }

    // Super admins bypass role checks
    if (user.isSuperAdmin) {
      return true
    }

    if (!requiredRoles.includes(user.role)) {
      throw AppException.forbidden(
        'AUTH_FORBIDDEN_INSUFFICIENT_ROLE',
        'Voce nao tem permissao para acessar este recurso',
      )
    }

    return true
  }
}
