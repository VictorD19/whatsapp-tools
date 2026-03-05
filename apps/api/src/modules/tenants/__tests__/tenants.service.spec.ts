import { Test, TestingModule } from '@nestjs/testing'
import { HttpStatus } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { TenantsService } from '../tenants.service'
import { TenantsRepository } from '../tenants.repository'
import { PipelineService } from '@modules/pipeline/pipeline.service'
import { TagService } from '@modules/tag/tag.service'
import { PlanService } from '@modules/plan/plan.service'

jest.mock('bcryptjs')

describe('TenantsService', () => {
  let service: TenantsService
  let repository: jest.Mocked<TenantsRepository>
  let pipelineService: jest.Mocked<PipelineService>
  let tagService: jest.Mocked<TagService>
  let planService: jest.Mocked<PlanService>

  const tenantId = 'tenant-123'

  const mockTenant = {
    id: tenantId,
    name: 'Acme Corp',
    slug: 'acme-corp',
    planId: 'plan-pro',
    protocolPrefix: 'SCHA',
    protocolSeq: 1000,
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    plan: { id: 'plan-pro', name: 'Pro', slug: 'pro' },
    _count: {
      users: 3,
      instances: 2,
      conversations: 15,
    },
  }

  const mockLocaleSettings = {
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
  }

  const mockAdminUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@acme.com',
    role: 'admin',
    createdAt: new Date(),
  }

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIdWithStats: jest.fn(),
      findBySlug: jest.fn(),
      findUserByEmail: jest.fn(),
      create: jest.fn(),
      createAdminUser: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      getNextProtocol: jest.fn(),
      updateProtocolPrefix: jest.fn(),
      getProtocolSettings: jest.fn(),
      getLocaleSettings: jest.fn(),
      updateLocaleSettings: jest.fn(),
    }

    const mockPipelineService = {
      createDefaultPipeline: jest.fn(),
    }

    const mockTagService = {
      seedDefaultTags: jest.fn(),
    }

    const mockPlanService = {
      findById: jest.fn(),
      findDefault: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: TenantsRepository, useValue: mockRepository },
        { provide: PipelineService, useValue: mockPipelineService },
        { provide: TagService, useValue: mockTagService },
        { provide: PlanService, useValue: mockPlanService },
      ],
    }).compile()

    service = module.get(TenantsService)
    repository = module.get(TenantsRepository)
    pipelineService = module.get(PipelineService)
    tagService = module.get(TagService)
    planService = module.get(PlanService)
  })

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      repository.findAll.mockResolvedValue({
        data: [mockTenant],
        total: 1,
      })

      const result = await service.findAll({ page: 1, limit: 10 } as never)

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(1)
      expect(repository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 })
    })

    it('should pass search filter to repository', async () => {
      repository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      })

      await service.findAll({ page: 1, limit: 10, search: 'acme' } as never)

      expect(repository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'acme',
      })
    })

    it('should calculate totalPages correctly', async () => {
      repository.findAll.mockResolvedValue({
        data: [],
        total: 25,
      })

      const result = await service.findAll({ page: 1, limit: 10 } as never)

      expect(result.meta.totalPages).toBe(3)
    })
  })

  describe('findById', () => {
    it('should return tenant with stats', async () => {
      repository.findByIdWithStats.mockResolvedValue(mockTenant)

      const result = await service.findById(tenantId)

      expect(result.data).toEqual(mockTenant)
      expect(repository.findByIdWithStats).toHaveBeenCalledWith(tenantId)
    })

    it('should throw TENANT_NOT_FOUND if not found', async () => {
      repository.findByIdWithStats.mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      })
    })
  })

  describe('create', () => {
    const createDto = {
      name: 'New Tenant',
      slug: 'new-tenant',
      planId: 'plan-pro',
      adminName: 'Admin',
      adminEmail: 'admin@new.com',
      adminPassword: 'securepass123',
    }

    it('should create tenant with admin user, pipeline and tags', async () => {
      repository.findBySlug.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue(null)
      planService.findById.mockResolvedValue({ data: { id: 'plan-pro', name: 'Pro' } } as never)
      repository.create.mockResolvedValue({
        id: 'new-tenant-id',
        name: createDto.name,
        slug: createDto.slug,
        planId: createDto.planId,
        protocolPrefix: 'SCHA',
        protocolSeq: 1000,
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
      repository.createAdminUser.mockResolvedValue(mockAdminUser)
      pipelineService.createDefaultPipeline.mockResolvedValue(undefined as never)
      tagService.seedDefaultTags.mockResolvedValue(undefined as never)

      const result = await service.create(createDto as never)

      expect(result.data).toHaveProperty('adminUser')
      expect(result.data.adminUser).toEqual(mockAdminUser)
      expect(repository.findBySlug).toHaveBeenCalledWith('new-tenant')
      expect(repository.findUserByEmail).toHaveBeenCalledWith('admin@new.com')
      expect(planService.findById).toHaveBeenCalledWith('plan-pro')
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        slug: createDto.slug,
        planId: createDto.planId,
      })
      expect(bcrypt.hash).toHaveBeenCalledWith('securepass123', 10)
      expect(repository.createAdminUser).toHaveBeenCalledWith({
        tenantId: 'new-tenant-id',
        name: 'Admin',
        email: 'admin@new.com',
        password: 'hashed-password',
      })
      expect(pipelineService.createDefaultPipeline).toHaveBeenCalledWith('new-tenant-id')
      expect(tagService.seedDefaultTags).toHaveBeenCalledWith('new-tenant-id')
    })

    it('should throw TENANT_SLUG_ALREADY_EXISTS if slug taken', async () => {
      repository.findBySlug.mockResolvedValue(mockTenant as never)

      await expect(service.create(createDto as never)).rejects.toMatchObject({
        code: 'TENANT_SLUG_ALREADY_EXISTS',
      })

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should throw TENANT_ADMIN_EMAIL_EXISTS if email taken', async () => {
      repository.findBySlug.mockResolvedValue(null)
      repository.findUserByEmail.mockResolvedValue({ id: 'existing-user' } as never)

      await expect(service.create(createDto as never)).rejects.toMatchObject({
        code: 'TENANT_ADMIN_EMAIL_EXISTS',
      })

      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update and return tenant', async () => {
      repository.findByIdWithStats.mockResolvedValue(mockTenant)
      repository.update.mockResolvedValue({
        ...mockTenant,
        name: 'Updated Name',
      })

      const result = await service.update(tenantId, { name: 'Updated Name' } as never)

      expect(result.data.name).toBe('Updated Name')
      expect(repository.update).toHaveBeenCalledWith(tenantId, { name: 'Updated Name' })
    })

    it('should validate plan when changing planId', async () => {
      repository.findByIdWithStats.mockResolvedValue(mockTenant)
      planService.findById.mockResolvedValue({ data: { id: 'plan-enterprise' } } as never)
      repository.update.mockResolvedValue({ ...mockTenant, planId: 'plan-enterprise' })

      await service.update(tenantId, { planId: 'plan-enterprise' } as never)

      expect(planService.findById).toHaveBeenCalledWith('plan-enterprise')
    })

    it('should throw TENANT_NOT_FOUND if not found', async () => {
      repository.findByIdWithStats.mockResolvedValue(null)

      await expect(
        service.update('nonexistent', { name: 'Nope' } as never),
      ).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      })

      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should soft delete tenant', async () => {
      repository.findByIdWithStats.mockResolvedValue(mockTenant)
      repository.softDelete.mockResolvedValue(undefined as never)

      const result = await service.remove(tenantId)

      expect(result.data.deleted).toBe(true)
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId)
    })

    it('should throw TENANT_NOT_FOUND if not found', async () => {
      repository.findByIdWithStats.mockResolvedValue(null)

      await expect(service.remove('nonexistent')).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      })

      expect(repository.softDelete).not.toHaveBeenCalled()
    })
  })

  describe('getLocaleSettings', () => {
    it('should return locale settings', async () => {
      repository.getLocaleSettings.mockResolvedValue(mockLocaleSettings)

      const result = await service.getLocaleSettings(tenantId)

      expect(result.data).toEqual(mockLocaleSettings)
      expect(repository.getLocaleSettings).toHaveBeenCalledWith(tenantId)
    })

    it('should throw TENANT_NOT_FOUND if tenant does not exist', async () => {
      repository.getLocaleSettings.mockResolvedValue(null)

      await expect(service.getLocaleSettings('nonexistent')).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      })
    })
  })

  describe('updateLocaleSettings', () => {
    it('should update and return locale settings (New York / USD)', async () => {
      const updated = { locale: 'en' as const, timezone: 'America/New_York', currency: 'USD' as const }
      repository.getLocaleSettings.mockResolvedValue(mockLocaleSettings)
      repository.updateLocaleSettings.mockResolvedValue(updated)

      const result = await service.updateLocaleSettings(tenantId, updated)

      expect(result.data).toEqual(updated)
      expect(repository.updateLocaleSettings).toHaveBeenCalledWith(tenantId, updated)
    })

    it('should update timezone to Caracas, Venezuela (UTC-4)', async () => {
      const updated = { locale: 'es' as const, timezone: 'America/Caracas', currency: 'BRL' as const }
      const returned = { locale: 'es', timezone: 'America/Caracas', currency: 'BRL' }
      repository.getLocaleSettings.mockResolvedValue(mockLocaleSettings)
      repository.updateLocaleSettings.mockResolvedValue(returned)

      const result = await service.updateLocaleSettings(tenantId, updated)

      expect(result.data.timezone).toBe('America/Caracas')
      expect(result.data.locale).toBe('es')
      expect(repository.updateLocaleSettings).toHaveBeenCalledWith(tenantId, updated)
    })

    it('should update timezone to Dubai (UTC+4)', async () => {
      const updated = { locale: 'en' as const, timezone: 'Asia/Dubai', currency: 'USD' as const }
      const returned = { locale: 'en', timezone: 'Asia/Dubai', currency: 'USD' }
      repository.getLocaleSettings.mockResolvedValue(mockLocaleSettings)
      repository.updateLocaleSettings.mockResolvedValue(returned)

      const result = await service.updateLocaleSettings(tenantId, updated)

      expect(result.data.timezone).toBe('Asia/Dubai')
      expect(repository.updateLocaleSettings).toHaveBeenCalledWith(tenantId, updated)
    })

    it('should allow partial updates (locale only)', async () => {
      const updated = { locale: 'es' as const }
      const returned = { ...mockLocaleSettings, locale: 'es' as const }
      repository.getLocaleSettings.mockResolvedValue(mockLocaleSettings)
      repository.updateLocaleSettings.mockResolvedValue(returned)

      const result = await service.updateLocaleSettings(tenantId, updated)

      expect(result.data.locale).toBe('es')
      expect(repository.updateLocaleSettings).toHaveBeenCalledWith(tenantId, updated)
    })

    it('should throw TENANT_NOT_FOUND if tenant does not exist', async () => {
      repository.getLocaleSettings.mockResolvedValue(null)

      await expect(
        service.updateLocaleSettings('nonexistent', { locale: 'en' as const }),
      ).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      })

      expect(repository.updateLocaleSettings).not.toHaveBeenCalled()
    })
  })
})
