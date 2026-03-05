import { Injectable, HttpStatus } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { UsersRepository } from './users.repository'
import { AppException } from '@core/errors/app.exception'
import { PrismaService } from '@core/database/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { UserFiltersDto } from './dto/user-filters.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMany(tenantId: string, filters: UserFiltersDto) {
    const { users, total } = await this.repository.findMany(tenantId, filters)

    return {
      data: users,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const user = await this.repository.findById(tenantId, id)
    if (!user) {
      throw AppException.notFound('USER_NOT_FOUND', 'Usuario nao encontrado', { id })
    }
    return user
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.repository.findByEmail(dto.email)
    if (existing) {
      throw new AppException(
        'USER_EMAIL_ALREADY_EXISTS',
        'Ja existe um usuario com este email',
        { email: dto.email },
        HttpStatus.CONFLICT,
      )
    }

    // Check user limit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: { select: { maxUsers: true } } },
    })
    if (!tenant) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado')
    }

    const maxUsers = tenant.plan.maxUsers
    const count = await this.repository.countActiveByTenant(tenantId)
    if (count >= maxUsers) {
      throw new AppException(
        'USER_LIMIT_REACHED',
        `Limite de ${maxUsers} usuarios atingido`,
        { current: count, max: maxUsers },
      )
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    return this.repository.create({
      tenantId,
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      role: dto.role,
    })
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findById(tenantId, id)
    return this.repository.update(tenantId, id, dto)
  }

  async changePassword(
    tenantId: string,
    targetUserId: string,
    currentUser: { id: string; role: string },
    dto: ChangePasswordDto,
  ) {
    // Admin can change any user's password; agents/viewers can only change their own
    if (currentUser.role !== 'admin' && currentUser.id !== targetUserId) {
      throw AppException.forbidden(
        'AUTH_FORBIDDEN_INSUFFICIENT_ROLE',
        'Voce so pode alterar sua propria senha',
      )
    }

    await this.findById(tenantId, targetUserId)

    const passwordHash = await bcrypt.hash(dto.password, 10)
    return this.repository.updatePassword(tenantId, targetUserId, passwordHash)
  }

  async softDelete(tenantId: string, id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new AppException(
        'USER_CANNOT_DELETE_SELF',
        'Voce nao pode excluir a si mesmo',
        { id },
      )
    }

    const user = await this.findById(tenantId, id)

    if (user.role === 'admin') {
      const adminCount = await this.repository.countAdmins(tenantId)
      if (adminCount <= 1) {
        throw new AppException(
          'USER_LAST_ADMIN',
          'Nao e possivel excluir o ultimo administrador do tenant',
          { id },
        )
      }
    }

    return this.repository.softDelete(tenantId, id)
  }
}
