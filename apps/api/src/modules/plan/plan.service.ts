import { Injectable, HttpStatus } from '@nestjs/common'
import { PlanRepository } from './plan.repository'
import { AppException } from '@core/errors/app.exception'
import { CreatePlanDto } from './dto/create-plan.dto'
import { UpdatePlanDto } from './dto/update-plan.dto'
import { PlanFiltersDto } from './dto/plan-filters.dto'

@Injectable()
export class PlanService {
  constructor(private readonly repository: PlanRepository) {}

  async findAll(filters: PlanFiltersDto) {
    const { data, total } = await this.repository.findAll(filters)
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

  async findActive() {
    const data = await this.repository.findActive()
    return { data }
  }

  async findById(id: string) {
    const plan = await this.repository.findById(id)
    if (!plan) {
      throw AppException.notFound('PLAN_NOT_FOUND', 'Plano nao encontrado', { id })
    }
    return { data: plan }
  }

  async findDefault() {
    return this.repository.findDefault()
  }

  async create(dto: CreatePlanDto) {
    // Validate slug uniqueness
    const existingSlug = await this.repository.findBySlug(dto.slug)
    if (existingSlug) {
      throw new AppException(
        'PLAN_SLUG_ALREADY_EXISTS',
        'Ja existe um plano com este slug',
        { slug: dto.slug },
        HttpStatus.CONFLICT,
      )
    }

    // If setting as default, clear other defaults
    if (dto.isDefault) {
      await this.repository.clearDefaultFlag()
    }

    const plan = await this.repository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      benefits: dto.benefits,
      maxInstances: dto.maxInstances,
      maxUsers: dto.maxUsers,
      maxAssistants: dto.maxAssistants,
      maxBroadcastsPerDay: dto.maxBroadcastsPerDay,
      maxContactsPerBroadcast: dto.maxContactsPerBroadcast,
      price: dto.price ?? null,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    })

    return { data: plan }
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.repository.findById(id)
    if (!plan) {
      throw AppException.notFound('PLAN_NOT_FOUND', 'Plano nao encontrado', { id })
    }

    // Cannot deactivate default plan
    if (dto.isActive === false && plan.isDefault) {
      throw new AppException(
        'PLAN_IS_DEFAULT',
        'Nao e possivel desativar o plano padrao',
        { id },
      )
    }

    // Cannot deactivate plan with active tenants
    if (dto.isActive === false) {
      const tenantsCount = await this.repository.countActiveTenants(id)
      if (tenantsCount > 0) {
        throw new AppException(
          'PLAN_HAS_TENANTS',
          `Plano possui ${tenantsCount} tenant(s) ativo(s)`,
          { id, tenantsCount },
        )
      }
    }

    // Cannot remove default flag without setting another
    if (dto.isDefault === false && plan.isDefault) {
      throw new AppException(
        'PLAN_IS_DEFAULT',
        'Defina outro plano como padrao antes de remover este',
        { id },
      )
    }

    // If setting as default, clear other defaults
    if (dto.isDefault === true && !plan.isDefault) {
      await this.repository.clearDefaultFlag()
    }

    const updated = await this.repository.update(id, dto)
    return { data: updated }
  }
}
