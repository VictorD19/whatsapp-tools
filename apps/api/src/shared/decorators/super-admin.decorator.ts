import { applyDecorators, UseGuards } from '@nestjs/common'
import { SuperAdminGuard } from '@core/guards/super-admin.guard'

export const SuperAdmin = () => applyDecorators(UseGuards(SuperAdminGuard))
