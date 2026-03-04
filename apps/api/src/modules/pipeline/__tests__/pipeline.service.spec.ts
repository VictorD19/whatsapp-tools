import { Test, TestingModule } from '@nestjs/testing'
import { PipelineService } from '../pipeline.service'
import { PipelineRepository } from '../pipeline.repository'

describe('PipelineService', () => {
  let service: PipelineService
  let repository: jest.Mocked<PipelineRepository>

  const tenantId = 'tenant-123'

  const now = new Date()

  const mockStages = [
    { id: 'stage-1', pipelineId: 'pipe-1', name: 'Novo Lead', color: '#6B7280', type: 'ACTIVE' as const, order: 1, isDefault: true, createdAt: now, updatedAt: now },
    { id: 'stage-2', pipelineId: 'pipe-1', name: 'Contatado', color: '#3B82F6', type: 'ACTIVE' as const, order: 2, isDefault: false, createdAt: now, updatedAt: now },
    { id: 'stage-3', pipelineId: 'pipe-1', name: 'Convertido', color: '#22C55E', type: 'WON' as const, order: 3, isDefault: false, createdAt: now, updatedAt: now },
    { id: 'stage-4', pipelineId: 'pipe-1', name: 'Perdido', color: '#EF4444', type: 'LOST' as const, order: 4, isDefault: false, createdAt: now, updatedAt: now },
  ]

  const mockPipeline = {
    id: 'pipe-1',
    tenantId,
    name: 'Pipeline Padrao',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    stages: mockStages,
    _count: { deals: 5 },
  }

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findStagesByPipelineId: jest.fn(),
      findStageById: jest.fn(),
      countDealsByStageId: jest.fn(),
      getMaxStageOrder: jest.fn(),
      countStagesByType: jest.fn(),
      createStage: jest.fn(),
      updateStage: jest.fn(),
      deleteStage: jest.fn(),
      reorderStages: jest.fn(),
      createDefaultPipeline: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PipelineRepository, useValue: mockRepository },
      ],
    }).compile()

    service = module.get(PipelineService)
    repository = module.get(PipelineRepository)
  })

  describe('findAll', () => {
    it('should return pipelines for tenant', async () => {
      repository.findAll.mockResolvedValue([mockPipeline])

      const result = await service.findAll(tenantId)

      expect(result).toEqual([mockPipeline])
      expect(repository.findAll).toHaveBeenCalledWith(tenantId)
    })
  })

  describe('findById', () => {
    it('should return a pipeline', async () => {
      repository.findById.mockResolvedValue(mockPipeline)

      const result = await service.findById(tenantId, 'pipe-1')

      expect(result).toEqual(mockPipeline)
      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'pipe-1')
    })

    it('should throw PIPELINE_NOT_FOUND if not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'PIPELINE_NOT_FOUND',
      })
    })
  })

  describe('create', () => {
    it('should create pipeline with default stages', async () => {
      const createdPipeline = { id: 'pipe-new', tenantId, name: 'Vendas', isDefault: false, stages: [] }
      repository.create.mockResolvedValue(createdPipeline as never)
      repository.createStage.mockResolvedValue({} as never)
      repository.findById.mockResolvedValue({ ...mockPipeline, id: 'pipe-new', name: 'Vendas', isDefault: false })

      const result = await service.create(tenantId, { name: 'Vendas' })

      expect(repository.create).toHaveBeenCalledWith({ tenantId, name: 'Vendas' })
      expect(repository.createStage).toHaveBeenCalledTimes(7)
      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'pipe-new')
      expect(result).toBeDefined()
    })
  })

  describe('createDefaultPipeline', () => {
    it('should create default pipeline with 7 stages', async () => {
      const defaultPipeline = { ...mockPipeline, isDefault: true }
      repository.createDefaultPipeline.mockResolvedValue(defaultPipeline as never)

      const result = await service.createDefaultPipeline(tenantId)

      expect(repository.createDefaultPipeline).toHaveBeenCalledWith(
        tenantId,
        expect.arrayContaining([
          expect.objectContaining({ name: 'Novo Lead', type: 'ACTIVE', order: 1, isDefault: true }),
          expect.objectContaining({ name: 'Convertido', type: 'WON', order: 6 }),
          expect.objectContaining({ name: 'Perdido', type: 'LOST', order: 7 }),
        ]),
      )
      expect(result).toEqual(defaultPipeline)
    })
  })

  describe('update', () => {
    it('should update pipeline name', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      const updated = { ...mockPipeline, name: 'Novo Nome' }
      repository.update.mockResolvedValue(updated)

      const result = await service.update(tenantId, 'pipe-1', { name: 'Novo Nome' })

      expect(result.name).toBe('Novo Nome')
      expect(repository.update).toHaveBeenCalledWith(tenantId, 'pipe-1', { name: 'Novo Nome' })
    })

    it('should throw PIPELINE_NOT_FOUND if pipeline does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.update(tenantId, 'nonexistent', { name: 'X' })).rejects.toMatchObject({
        code: 'PIPELINE_NOT_FOUND',
      })
    })
  })

  describe('delete', () => {
    it('should delete a non-default pipeline', async () => {
      const nonDefaultPipeline = { ...mockPipeline, isDefault: false }
      repository.findById.mockResolvedValue(nonDefaultPipeline)

      await service.delete(tenantId, 'pipe-1')

      expect(repository.delete).toHaveBeenCalledWith('pipe-1')
    })

    it('should throw PIPELINE_IS_DEFAULT if pipeline is default', async () => {
      repository.findById.mockResolvedValue(mockPipeline)

      await expect(service.delete(tenantId, 'pipe-1')).rejects.toMatchObject({
        code: 'PIPELINE_IS_DEFAULT',
      })
    })

    it('should throw PIPELINE_NOT_FOUND if pipeline does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.delete(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'PIPELINE_NOT_FOUND',
      })
    })
  })

  describe('createStage', () => {
    it('should create a stage with next order', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.getMaxStageOrder.mockResolvedValue(4)
      const newStage = { id: 'stage-new', pipelineId: 'pipe-1', name: 'Follow-up', color: '#FF0000', type: 'ACTIVE' as const, order: 5, isDefault: false, createdAt: now, updatedAt: now }
      repository.createStage.mockResolvedValue(newStage)

      const result = await service.createStage(tenantId, 'pipe-1', {
        name: 'Follow-up',
        color: '#FF0000',
        type: 'ACTIVE',
      })

      expect(result).toEqual(newStage)
      expect(repository.createStage).toHaveBeenCalledWith({
        pipelineId: 'pipe-1',
        name: 'Follow-up',
        color: '#FF0000',
        type: 'ACTIVE',
        order: 5,
      })
    })

    it('should throw PIPELINE_NOT_FOUND if pipeline does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.createStage(tenantId, 'nonexistent', { name: 'X', color: '#000000', type: 'ACTIVE' }),
      ).rejects.toMatchObject({ code: 'PIPELINE_NOT_FOUND' })
    })
  })

  describe('updateStage', () => {
    it('should update a stage', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[1])
      const updatedStage = { ...mockStages[1], name: 'Novo Nome' }
      repository.updateStage.mockResolvedValue(updatedStage)

      const result = await service.updateStage(tenantId, 'pipe-1', 'stage-2', { name: 'Novo Nome' })

      expect(result.name).toBe('Novo Nome')
      expect(repository.updateStage).toHaveBeenCalledWith('stage-2', {
        name: 'Novo Nome',
        color: undefined,
        type: undefined,
      })
    })

    it('should throw PIPELINE_STAGE_NOT_FOUND if stage does not exist', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(null)

      await expect(
        service.updateStage(tenantId, 'pipe-1', 'nonexistent', { name: 'X' }),
      ).rejects.toMatchObject({ code: 'PIPELINE_STAGE_NOT_FOUND' })
    })

    it('should validate type change when changing away from ACTIVE', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[1]) // ACTIVE stage
      repository.countStagesByType.mockResolvedValue(1) // only 1 ACTIVE left

      await expect(
        service.updateStage(tenantId, 'pipe-1', 'stage-2', { type: 'WON' }),
      ).rejects.toMatchObject({ code: 'PIPELINE_REQUIRES_ACTIVE_STAGE' })
    })

    it('should allow type change when enough stages of that type remain', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[1]) // ACTIVE stage
      repository.countStagesByType.mockResolvedValue(2) // 2 ACTIVE remain
      const updatedStage = { ...mockStages[1], type: 'WON' as const }
      repository.updateStage.mockResolvedValue(updatedStage)

      const result = await service.updateStage(tenantId, 'pipe-1', 'stage-2', { type: 'WON' })

      expect(result.type).toBe('WON')
    })
  })

  describe('deleteStage', () => {
    it('should delete a non-default stage with no deals', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[1]) // non-default ACTIVE
      repository.countDealsByStageId.mockResolvedValue(0)
      repository.countStagesByType.mockResolvedValue(2) // 2 ACTIVE remain

      await service.deleteStage(tenantId, 'pipe-1', 'stage-2')

      expect(repository.deleteStage).toHaveBeenCalledWith('stage-2')
    })

    it('should throw PIPELINE_STAGE_NOT_FOUND if stage does not exist', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(null)

      await expect(
        service.deleteStage(tenantId, 'pipe-1', 'nonexistent'),
      ).rejects.toMatchObject({ code: 'PIPELINE_STAGE_NOT_FOUND' })
    })

    it('should throw PIPELINE_STAGE_IS_DEFAULT if stage is default', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[0]) // isDefault: true

      await expect(
        service.deleteStage(tenantId, 'pipe-1', 'stage-1'),
      ).rejects.toMatchObject({ code: 'PIPELINE_STAGE_IS_DEFAULT' })
    })

    it('should throw PIPELINE_STAGE_HAS_DEALS if stage has linked deals', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[1])
      repository.countDealsByStageId.mockResolvedValue(3)

      await expect(
        service.deleteStage(tenantId, 'pipe-1', 'stage-2'),
      ).rejects.toMatchObject({ code: 'PIPELINE_STAGE_HAS_DEALS' })
    })

    it('should throw PIPELINE_REQUIRES_ACTIVE_STAGE if last active stage', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[1]) // ACTIVE, non-default
      repository.countDealsByStageId.mockResolvedValue(0)
      repository.countStagesByType.mockResolvedValue(1) // only 1 ACTIVE left

      await expect(
        service.deleteStage(tenantId, 'pipe-1', 'stage-2'),
      ).rejects.toMatchObject({ code: 'PIPELINE_REQUIRES_ACTIVE_STAGE' })
    })

    it('should throw PIPELINE_REQUIRES_WON_STAGE if last WON stage', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[2]) // WON, non-default
      repository.countDealsByStageId.mockResolvedValue(0)
      repository.countStagesByType.mockResolvedValue(1) // only 1 WON left

      await expect(
        service.deleteStage(tenantId, 'pipe-1', 'stage-3'),
      ).rejects.toMatchObject({ code: 'PIPELINE_REQUIRES_WON_STAGE' })
    })

    it('should throw PIPELINE_REQUIRES_LOST_STAGE if last LOST stage', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStageById.mockResolvedValue(mockStages[3]) // LOST, non-default
      repository.countDealsByStageId.mockResolvedValue(0)
      repository.countStagesByType.mockResolvedValue(1) // only 1 LOST left

      await expect(
        service.deleteStage(tenantId, 'pipe-1', 'stage-4'),
      ).rejects.toMatchObject({ code: 'PIPELINE_REQUIRES_LOST_STAGE' })
    })
  })

  describe('reorderStages', () => {
    it('should reorder stages successfully', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStagesByPipelineId
        .mockResolvedValueOnce(mockStages) // first call: validation
        .mockResolvedValueOnce(mockStages) // second call: return result

      repository.reorderStages.mockResolvedValue([] as never)

      const reorderDto = {
        stages: [
          { id: 'stage-1', order: 2 },
          { id: 'stage-2', order: 1 },
        ],
      }

      const result = await service.reorderStages(tenantId, 'pipe-1', reorderDto)

      expect(repository.reorderStages).toHaveBeenCalledWith(reorderDto.stages)
      expect(result).toEqual(mockStages)
    })

    it('should throw PIPELINE_STAGE_NOT_FOUND if stage ID does not belong to pipeline', async () => {
      repository.findById.mockResolvedValue(mockPipeline)
      repository.findStagesByPipelineId.mockResolvedValue(mockStages)

      const reorderDto = {
        stages: [{ id: 'unknown-stage', order: 1 }],
      }

      await expect(
        service.reorderStages(tenantId, 'pipe-1', reorderDto),
      ).rejects.toMatchObject({ code: 'PIPELINE_STAGE_NOT_FOUND' })
    })
  })
})
