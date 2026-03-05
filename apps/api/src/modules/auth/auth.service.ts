import { Injectable, HttpStatus } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { AuthRepository } from './auth.repository'
import { AppException } from '@core/errors/app.exception'
import { PipelineService } from '@modules/pipeline/pipeline.service'
import { TagService } from '@modules/tag/tag.service'
import { PlanService } from '@modules/plan/plan.service'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly pipelineService: PipelineService,
    private readonly tagService: TagService,
    private readonly planService: PlanService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.repo.findUserByEmail(email)

    if (!user) {
      throw AppException.unauthorized('AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos')
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw AppException.unauthorized('AUTH_INVALID_CREDENTIALS', 'Email ou senha inválidos')
    }

    return this.generateAuthResponse(user)
  }

  async register(data: {
    tenantName: string
    name: string
    email: string
    password: string
  }) {
    // 1. Validate email is unique
    const existing = await this.repo.findUserByEmail(data.email)
    if (existing) {
      throw new AppException(
        'AUTH_EMAIL_ALREADY_EXISTS',
        'Ja existe uma conta com este email',
        { email: data.email },
        HttpStatus.CONFLICT,
      )
    }

    // 2. Get default plan
    const defaultPlan = await this.planService.findDefault()
    if (!defaultPlan) {
      throw new AppException(
        'PLAN_NOT_FOUND',
        'Nenhum plano padrao configurado',
        {},
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    // 3. Create tenant with default plan
    const slug = slugify(data.tenantName)
    const tenant = await this.repo.createTenant({
      name: data.tenantName,
      slug,
      planId: defaultPlan.id,
    })

    // 4. Create user (admin of the new tenant)
    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await this.repo.createUser({
      tenantId: tenant.id,
      name: data.name,
      email: data.email,
      password: passwordHash,
      role: 'admin',
    })

    // 5. Create default pipeline
    await this.pipelineService.createDefaultPipeline(tenant.id)

    // 6. Create default tags
    await this.tagService.seedDefaultTags(tenant.id)

    // 7. Generate tokens and return
    return this.generateAuthResponse(user)
  }

  private generateAuthResponse(user: {
    id: string
    tenantId: string
    email: string
    name: string
    role: string
    isSuperAdmin: boolean
    tenant: {
      id: string
      name: string
      slug: string
      locale?: string
      timezone?: string
      currency?: string
      plan: { name: string; slug: string }
    }
  }) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    }

    const accessToken = this.jwt.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    })

    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan.slug,
          locale: user.tenant.locale ?? 'pt-BR',
          timezone: user.tenant.timezone ?? 'America/Sao_Paulo',
          currency: user.tenant.currency ?? 'BRL',
        },
      },
    }
  }
}
