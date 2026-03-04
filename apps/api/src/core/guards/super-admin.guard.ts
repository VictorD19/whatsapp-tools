import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user?.isSuperAdmin) {
      throw AppException.forbidden(
        'AUTH_FORBIDDEN_NOT_SUPER_ADMIN',
        'Acesso restrito a super administradores',
      )
    }

    return true
  }
}
