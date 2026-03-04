import { Test, TestingModule } from '@nestjs/testing'
import { HttpStatus } from '@nestjs/common'
import { PlanService } from '../plan.service'
import { PlanRepository } from '../plan.repository'
import { AppException } from '@core/errors/app.exception'

describe('PlanService', () => {
  let service: PlanService
  let repository: jest.Mocked<PlanRepository>

  const mockPlan = {
    id: 'plan-1',
    name: 'Pro',
    slug: 'pro',
    description: 'Plano profissional',
    benefits: ['10 instancias', '20 usuarios'],
    maxInstances: 10,
    maxUsers: 20,
    maxAssistants: 5,
    maxBroadcastsPerDay: 50,
    maxContactsPerBroadcast: 2000,
    price: 97.0 as never,
    isDefault: false,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { tenants: 3 },
  }

  const mockDefaultPlan = {
    ...mockPlan,
    id: 'plan-free',
    name: 'Free',
    slug: 'free',
    isDefault: true,
    _count: { tenants: 5 },
  }

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findDefault: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      clearDefaultFlag: jest.fn(),
      countActiveTenants: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        { provide: PlanRepository, useValue: mockRepository },
      ],
    }).compile()

    service = module.get(PlanService)
    repository = module.get(PlanRepository)
  })

  describe('findAll', () => {
    it('should return paginated plans', async () => {
      repository.findAll.mockResolvedValue({
        data: [mockPlan],
        total: 1,
      })

      const result = await service.findAll({ page: 1, limit: 10 } as never)

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.totalPages).toBe(1)
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

  describe('findActive', () => {
    it('should return active plans', async () => {
      repository.findActive.mockResolvedValue([mockPlan])

      const result = await service.findActive()

      expect(result.data).toHaveLength(1)
      expect(repository.findActive).toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('should return plan when found', async () => {
      repository.findById.mockResolvedValue(mockPlan)

      const result = await service.findById('plan-1')

      expect(result.data).toEqual(mockPlan)
    })

    it('should throw PLAN_NOT_FOUND when not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        code: 'PLAN_NOT_FOUND',
      })
    })
  })

  describe('findDefault', () => {
    it('should return default plan', async () => {
      repository.findDefault.mockResolvedValue(mockDefaultPlan)

      const result = await service.findDefault()

      expect(result).toEqual(mockDefaultPlan)
    })

    it('should return null when no default', async () => {
      repository.findDefault.mockResolvedValue(null)

      const result = await service.findDefault()

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    const createDto = {
      name: 'Starter',
      slug: 'starter',
      description: 'Plano inicial',
      benefits: ['3 instancias'],
      maxInstances: 3,
      maxUsers: 5,
      maxAssistants: 1,
      maxBroadcastsPerDay: 5,
      maxContactsPerBroadcast: 500,
      price: null,
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    }

    it('should create plan successfully', async () => {
      repository.findBySlug.mockResolvedValue(null)
      repository.create.mockResolvedValue({ ...mockPlan, ...createDto, id: 'new-plan' })

      const result = await service.create(createDto as never)

      expect(result.data).toBeDefined()
      expect(repository.create).toHaveBeenCalled()
    })

    it('should throw PLAN_SLUG_ALREADY_EXISTS when slug taken', async () => {
      repository.findBySlug.mockResolvedValue(mockPlan as never)

      await expect(service.create(createDto as never)).rejects.toMatchObject({
        code: 'PLAN_SLUG_ALREADY_EXISTS',
      })

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should clear default flag when creating default plan', async () => {
      repository.findBySlug.mockResolvedValue(null)
      repository.clearDefaultFlag.mockResolvedValue({ count: 1 })
      repository.create.mockResolvedValue({ ...mockPlan, isDefault: true })

      await service.create({ ...createDto, isDefault: true } as never)

      expect(repository.clearDefaultFlag).toHaveBeenCalled()
    })

    it('should not clear default flag when not default', async () => {
      repository.findBySlug.mockResolvedValue(null)
      repository.create.mockResolvedValue(mockPlan)

      await service.create(createDto as never)

      expect(repository.clearDefaultFlag).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update plan successfully', async () => {
      repository.findById.mockResolvedValue(mockPlan)
      repository.update.mockResolvedValue({ ...mockPlan, name: 'Pro Plus' })

      const result = await service.update('plan-1', { name: 'Pro Plus' })

      expect(result.data.name).toBe('Pro Plus')
    })

    it('should throw PLAN_NOT_FOUND when not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toMatchObject({
        code: 'PLAN_NOT_FOUND',
      })
    })

    it('should throw PLAN_IS_DEFAULT when deactivating default plan', async () => {
      repository.findById.mockResolvedValue(mockDefaultPlan)

      await expect(
        service.update('plan-free', { isActive: false }),
      ).rejects.toMatchObject({
        code: 'PLAN_IS_DEFAULT',
      })
    })

    it('should throw PLAN_HAS_TENANTS when deactivating plan with tenants', async () => {
      repository.findById.mockResolvedValue(mockPlan)
      repository.countActiveTenants.mockResolvedValue(3)

      await expect(
        service.update('plan-1', { isActive: false }),
      ).rejects.toMatchObject({
        code: 'PLAN_HAS_TENANTS',
      })
    })

    it('should allow deactivation when plan has no tenants', async () => {
      repository.findById.mockResolvedValue(mockPlan)
      repository.countActiveTenants.mockResolvedValue(0)
      repository.update.mockResolvedValue({ ...mockPlan, isActive: false })

      const result = await service.update('plan-1', { isActive: false })

      expect(result.data.isActive).toBe(false)
    })

    it('should throw PLAN_IS_DEFAULT when removing default flag', async () => {
      repository.findById.mockResolvedValue(mockDefaultPlan)

      await expect(
        service.update('plan-free', { isDefault: false }),
      ).rejects.toMatchObject({
        code: 'PLAN_IS_DEFAULT',
      })
    })

    it('should clear default flag when setting new default', async () => {
      repository.findById.mockResolvedValue(mockPlan)
      repository.clearDefaultFlag.mockResolvedValue({ count: 1 })
      repository.update.mockResolvedValue({ ...mockPlan, isDefault: true })

      await service.update('plan-1', { isDefault: true })

      expect(repository.clearDefaultFlag).toHaveBeenCalled()
    })
  })
})
