import { Test, TestingModule } from '@nestjs/testing'
import { AiToolsService } from '../ai-tools.service'
import { AiToolsRepository } from '../ai-tools.repository'
import { AiToolType } from '@prisma/client'

describe('AiToolsService', () => {
  let service: AiToolsService
  let repository: jest.Mocked<AiToolsRepository>

  const tenantId = 'tenant-123'
  const now = new Date()

  const mockTool = {
    id: 'tool-1',
    tenantId,
    name: 'Buscar Contato',
    description: 'Busca dados do contato',
    type: AiToolType.BUSCAR_CONTATO,
    config: {},
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        { provide: AiToolsRepository, useValue: mockRepository },
      ],
    }).compile()

    service = module.get(AiToolsService)
    repository = module.get(AiToolsRepository)
  })

  describe('findAll', () => {
    it('should return all tools for tenant', async () => {
      const tools = [mockTool, { ...mockTool, id: 'tool-2', name: 'Criar Deal' }]
      repository.findAll.mockResolvedValue(tools)

      const result = await service.findAll(tenantId)

      expect(result.data).toHaveLength(2)
      expect(result.data).toEqual(tools)
      expect(repository.findAll).toHaveBeenCalledWith(tenantId)
    })
  })

  describe('findById', () => {
    it('should return tool when found', async () => {
      repository.findById.mockResolvedValue(mockTool)

      const result = await service.findById(tenantId, 'tool-1')

      expect(result.data).toEqual(mockTool)
      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'tool-1')
    })

    it('should throw AI_TOOL_NOT_FOUND when tool does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.findById(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'AI_TOOL_NOT_FOUND' })
    })
  })

  describe('create', () => {
    it('should create a tool successfully', async () => {
      repository.create.mockResolvedValue(mockTool)

      const result = await service.create(tenantId, {
        name: 'Buscar Contato',
        type: AiToolType.BUSCAR_CONTATO,
        config: {},
        isActive: true,
      })

      expect(result.data).toEqual(mockTool)
      expect(repository.create).toHaveBeenCalledWith(tenantId, {
        name: 'Buscar Contato',
        type: AiToolType.BUSCAR_CONTATO,
        config: {},
        isActive: true,
      })
    })
  })

  describe('update', () => {
    it('should update a tool successfully', async () => {
      const updated = { ...mockTool, name: 'Buscar Contato v2' }
      repository.findById.mockResolvedValue(mockTool)
      repository.update.mockResolvedValue(updated)

      const result = await service.update(tenantId, 'tool-1', { name: 'Buscar Contato v2' })

      expect(result.data.name).toBe('Buscar Contato v2')
    })

    it('should throw AI_TOOL_NOT_FOUND when tool does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'Test' }),
      ).rejects.toMatchObject({ code: 'AI_TOOL_NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('should soft delete a tool successfully', async () => {
      repository.findById.mockResolvedValue(mockTool)
      repository.softDelete.mockResolvedValue({ ...mockTool, deletedAt: now })

      const result = await service.delete(tenantId, 'tool-1')

      expect(result.data.deleted).toBe(true)
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'tool-1')
    })

    it('should throw AI_TOOL_NOT_FOUND when tool does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.delete(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'AI_TOOL_NOT_FOUND' })
    })
  })
})
