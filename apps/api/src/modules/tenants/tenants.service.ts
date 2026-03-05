import { Injectable, HttpStatus } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { TenantsRepository } from './tenants.repository'
import { AppException } from '@core/errors/app.exception'
import { PipelineService } from '@modules/pipeline/pipeline.service'
import { TagService } from '@modules/tag/tag.service'
import { PlanService } from '@modules/plan/plan.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { TenantFiltersDto } from './dto/tenant-filters.dto'
import { UpdateLocaleSettingsDto } from './dto/update-locale-settings.dto'

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly pipelineService: PipelineService,
    private readonly tagService: TagService,
    private readonly planService: PlanService,
  ) {}

  // ── Usage ──

  async getUsage(tenantId: string) {
    const tenant = await this.tenantsRepository.findUsageByTenant(tenantId)
    if (!tenant) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado', { tenantId })
    }

    return {
      data: {
        plan: tenant.plan,
        usage: {
          instances: tenant._count.instances,
          users: tenant._count.users,
          assistants: 0,
          broadcastsToday: 0,
        },
      },
    }
  }

  // ── Locale settings ──

  async getLocaleSettings(tenantId: string) {
    const settings = await this.tenantsRepository.getLocaleSettings(tenantId)
    if (!settings) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado', { tenantId })
    }
    return { data: settings }
  }

  async updateLocaleSettings(tenantId: string, dto: UpdateLocaleSettingsDto) {
    const existing = await this.tenantsRepository.getLocaleSettings(tenantId)
    if (!existing) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado', { tenantId })
    }
    const updated = await this.tenantsRepository.updateLocaleSettings(tenantId, dto)
    return { data: updated }
  }

  // ── Protocol settings (existing) ──

  async getNextProtocol(tenantId: string): Promise<string> {
    return this.tenantsRepository.getNextProtocol(tenantId)
  }

  async updateProtocolPrefix(tenantId: string, prefix: string) {
    return this.tenantsRepository.updateProtocolPrefix(tenantId, prefix)
  }

  async getProtocolSettings(tenantId: string) {
    return this.tenantsRepository.getProtocolSettings(tenantId)
  }

  // ── Admin CRUD ──

  async findAll(filters: TenantFiltersDto) {
    const { data, total } = await this.tenantsRepository.findAll(filters)
    return {
      data,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    }
  }

  async findById(id: string) {
    const tenant = await this.tenantsRepository.findByIdWithStats(id)
    if (!tenant) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado', { id })
    }
    return { data: tenant }
  }

  async create(dto: CreateTenantDto) {
    // 1. Validate slug unique
    const existingSlug = await this.tenantsRepository.findBySlug(dto.slug)
    if (existingSlug) {
      throw new AppException(
        'TENANT_SLUG_ALREADY_EXISTS',
        'Ja existe um tenant com este slug',
        { slug: dto.slug },
        HttpStatus.CONFLICT,
      )
    }

    // 2. Validate admin email unique
    const existingEmail = await this.tenantsRepository.findUserByEmail(dto.adminEmail)
    if (existingEmail) {
      throw new AppException(
        'TENANT_ADMIN_EMAIL_EXISTS',
        'Ja existe um usuario com este email',
        { email: dto.adminEmail },
        HttpStatus.CONFLICT,
      )
    }

    // 3. Validate plan exists and is active
    await this.planService.findById(dto.planId)

    // 4. Create tenant
    const tenant = await this.tenantsRepository.create({
      name: dto.name,
      slug: dto.slug,
      planId: dto.planId,
    })

    // 5. Create admin user
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10)
    const adminUser = await this.tenantsRepository.createAdminUser({
      tenantId: tenant.id,
      name: dto.adminName,
      email: dto.adminEmail,
      password: passwordHash,
    })

    // 6. Create default pipeline
    await this.pipelineService.createDefaultPipeline(tenant.id)

    // 7. Create default tags
    await this.tagService.seedDefaultTags(tenant.id)

    return { data: { ...tenant, adminUser } }
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.tenantsRepository.findByIdWithStats(id)
    if (!tenant) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado', { id })
    }

    // Validate plan exists if changing
    if (dto.planId) {
      await this.planService.findById(dto.planId)
    }

    const updated = await this.tenantsRepository.update(id, dto)
    return { data: updated }
  }

  async remove(id: string) {
    const tenant = await this.tenantsRepository.findByIdWithStats(id)
    if (!tenant) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant nao encontrado', { id })
    }

    await this.tenantsRepository.softDelete(id)
    return { data: { deleted: true } }
  }
}
