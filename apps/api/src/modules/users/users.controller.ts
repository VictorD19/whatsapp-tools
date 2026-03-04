import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { Roles } from '@shared/decorators/roles.decorator'
import { RoleGuard } from '@core/guards/role.guard'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createUserSchema, CreateUserDto } from './dto/create-user.dto'
import { updateUserSchema, UpdateUserDto } from './dto/update-user.dto'
import { changePasswordSchema, ChangePasswordDto } from './dto/change-password.dto'
import { userFiltersSchema, UserFiltersDto } from './dto/user-filters.dto'

@Controller('users')
@UseGuards(RoleGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findMany(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(userFiltersSchema)) filters: UserFiltersDto,
  ) {
    return this.usersService.findMany(tenantId, filters)
  }

  @Get(':id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.findById(tenantId, id)
  }

  @Post()
  @Roles('admin')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, dto)
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto)
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  softDelete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.softDelete(tenantId, id, user.id)
  }

  @Patch(':id/password')
  changePassword(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(tenantId, id, user, dto)
  }
}
