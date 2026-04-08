import { Test, TestingModule } from '@nestjs/testing'
import { AssistantsService } from '../assistants.service'
import { AssistantsRepository } from '../assistants.repository'
import { TEXT_TO_SPEECH } from '@modules/ai/ai.tokens'
import { StorageService } from '@modules/storage/storage.service'
import { AiToolsService } from '@modules/ai-tools/ai-tools.service'

describe('AssistantsService', () => {
  let service: AssistantsService
  let repository: jest.Mocked<AssistantsRepository>

  const tenantId = 'tenant-123'
  const now = new Date()

  const mockAssistant = {
    id: 'assistant-1',
    tenantId,
    name: 'SDR Bot',
    description: 'Bot de vendas',
    avatarUrl: null,
    avatarEmoji: null,
    model: 'gpt-4o-mini',
    systemPrompt: 'Voce e um assistente de vendas',
    waitTimeSeconds: 5,
    isActive: true,
    handoffKeywords: ['humano', 'atendente'],
    audioResponseMode: 'never',
    voiceId: 'pt-BR-FranciscaNeural',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    knowledgeBases: [] as any[],
    tools: [] as any[],
  }

  const mockConversation = {
    id: 'conv-1',
    assistantPausedAt: null,
  }

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      linkKnowledgeBase: jest.fn(),
      unlinkKnowledgeBase: jest.fn(),
      linkTool: jest.fn(),
      unlinkTool: jest.fn(),
      setConversationAssistant: jest.fn(),
      findConversation: jest.fn(),
    }

    const mockTts = {
      synthesize: jest.fn().mockResolvedValue({
        audioBuffer: Buffer.from('fake-audio'),
        mimetype: 'audio/mpeg',
      }),
    }

    const mockStorage = {
      download: jest.fn(),
      uploadRaw: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantsService,
        { provide: AssistantsRepository, useValue: mockRepository },
        { provide: TEXT_TO_SPEECH, useValue: mockTts },
        { provide: StorageService, useValue: mockStorage },
        { provide: AiToolsService, useValue: { findAll: jest.fn().mockResolvedValue({ data: [] }) } },
      ],
    }).compile()

    service = module.get(AssistantsService)
    repository = module.get(AssistantsRepository)
  })

  describe('findAll', () => {
    it('should return assistants for tenant', async () => {
      const assistants = [mockAssistant]
      repository.findAll.mockResolvedValue(assistants)

      const result = await service.findAll(tenantId)

      expect(result.data).toEqual(assistants)
      expect(repository.findAll).toHaveBeenCalledWith(tenantId)
    })

    it('should return empty array when no assistants', async () => {
      repository.findAll.mockResolvedValue([])

      const result = await service.findAll(tenantId)

      expect(result.data).toHaveLength(0)
    })
  })

  describe('findById', () => {
    it('should return assistant when found', async () => {
      repository.findById.mockResolvedValue(mockAssistant)

      const result = await service.findById(tenantId, 'assistant-1')

      expect(result.data).toEqual(mockAssistant)
      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'assistant-1')
    })

    it('should throw ASSISTANT_NOT_FOUND when not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.findById(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'ASSISTANT_NOT_FOUND' })
    })
  })

  describe('create', () => {
    it('should create assistant successfully', async () => {
      const dto = {
        name: 'SDR Bot',
        systemPrompt: 'Voce e um assistente de vendas',
      }
      repository.create.mockResolvedValue(mockAssistant)

      const result = await service.create(tenantId, dto as any)

      expect(result.data).toEqual(mockAssistant)
      expect(repository.create).toHaveBeenCalledWith(tenantId, dto)
    })
  })

  describe('update', () => {
    it('should update assistant successfully', async () => {
      const updated = { ...mockAssistant, name: 'Updated Bot' }
      repository.findById.mockResolvedValue(mockAssistant)
      repository.update.mockResolvedValue(updated)

      const result = await service.update(tenantId, 'assistant-1', { name: 'Updated Bot' })

      expect(result.data!.name).toBe('Updated Bot')
      expect(repository.update).toHaveBeenCalledWith(tenantId, 'assistant-1', { name: 'Updated Bot' })
    })

    it('should throw ASSISTANT_NOT_FOUND when not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'New Name' }),
      ).rejects.toMatchObject({ code: 'ASSISTANT_NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('should soft delete assistant successfully', async () => {
      repository.findById.mockResolvedValue(mockAssistant)
      repository.softDelete.mockResolvedValue({ count: 1 })

      const result = await service.delete(tenantId, 'assistant-1')

      expect(result.data.deleted).toBe(true)
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'assistant-1')
    })

    it('should throw ASSISTANT_NOT_FOUND when not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.delete(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'ASSISTANT_NOT_FOUND' })
    })
  })

  describe('linkKnowledgeBase', () => {
    it('should link knowledge base to assistant', async () => {
      const withKb = { ...mockAssistant, knowledgeBases: [{ knowledgeBaseId: 'kb-1' }] as any[] }
      repository.findById
        .mockResolvedValueOnce(mockAssistant)
        .mockResolvedValueOnce(withKb)
      repository.linkKnowledgeBase.mockResolvedValue({} as any)

      const result = await service.linkKnowledgeBase(tenantId, 'assistant-1', 'kb-1')

      expect(result.data!.knowledgeBases).toHaveLength(1)
      expect(repository.linkKnowledgeBase).toHaveBeenCalledWith('assistant-1', 'kb-1')
    })

    it('should throw ASSISTANT_NOT_FOUND when assistant not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.linkKnowledgeBase(tenantId, 'nonexistent', 'kb-1'),
      ).rejects.toMatchObject({ code: 'ASSISTANT_NOT_FOUND' })
    })
  })

  describe('unlinkKnowledgeBase', () => {
    it('should unlink knowledge base from assistant', async () => {
      repository.findById
        .mockResolvedValueOnce(mockAssistant)
        .mockResolvedValueOnce(mockAssistant)
      repository.unlinkKnowledgeBase.mockResolvedValue({} as any)

      const result = await service.unlinkKnowledgeBase(tenantId, 'assistant-1', 'kb-1')

      expect(result.data!.knowledgeBases).toHaveLength(0)
      expect(repository.unlinkKnowledgeBase).toHaveBeenCalledWith('assistant-1', 'kb-1')
    })
  })

  describe('linkTool', () => {
    it('should link tool to assistant', async () => {
      const withTool = { ...mockAssistant, tools: [{ aiToolId: 'tool-1' }] as any[] }
      repository.findById
        .mockResolvedValueOnce(mockAssistant)
        .mockResolvedValueOnce(withTool)
      repository.linkTool.mockResolvedValue({} as any)

      const result = await service.linkTool(tenantId, 'assistant-1', 'tool-1')

      expect(result.data!.tools).toHaveLength(1)
      expect(repository.linkTool).toHaveBeenCalledWith('assistant-1', 'tool-1')
    })

    it('should throw ASSISTANT_NOT_FOUND when assistant not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.linkTool(tenantId, 'nonexistent', 'tool-1'),
      ).rejects.toMatchObject({ code: 'ASSISTANT_NOT_FOUND' })
    })
  })

  describe('unlinkTool', () => {
    it('should unlink tool from assistant', async () => {
      repository.findById
        .mockResolvedValueOnce(mockAssistant)
        .mockResolvedValueOnce(mockAssistant)
      repository.unlinkTool.mockResolvedValue({} as any)

      const result = await service.unlinkTool(tenantId, 'assistant-1', 'tool-1')

      expect(result.data!.tools).toHaveLength(0)
      expect(repository.unlinkTool).toHaveBeenCalledWith('assistant-1', 'tool-1')
    })
  })

  describe('setConversationAssistant', () => {
    it('deve pausar o assistente da conversa', async () => {
      repository.setConversationAssistant.mockResolvedValue({ count: 1 })

      const result = await service.setConversationAssistant(tenantId, 'conv-1', {
        paused: true,
      })

      expect(result.data.paused).toBe(true)
      expect(repository.setConversationAssistant).toHaveBeenCalledWith(
        tenantId,
        'conv-1',
        true,
      )
    })

    it('deve retomar o assistente da conversa', async () => {
      repository.setConversationAssistant.mockResolvedValue({ count: 1 })

      const result = await service.setConversationAssistant(tenantId, 'conv-1', {
        paused: false,
      })

      expect(result.data.paused).toBe(false)
      expect(repository.setConversationAssistant).toHaveBeenCalledWith(
        tenantId,
        'conv-1',
        false,
      )
    })
  })
})
