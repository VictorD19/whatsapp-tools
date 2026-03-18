import { Test, TestingModule } from '@nestjs/testing'
import { KnowledgeBaseService } from '../knowledge-base.service'
import { KnowledgeBaseRepository } from '../knowledge-base.repository'
import { KbIngestionProducer } from '../queues/kb-ingestion.producer'
import { StorageService } from '@modules/storage/storage.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'
import { LoggerService } from '@core/logger/logger.service'

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService
  let repository: jest.Mocked<KnowledgeBaseRepository>
  let producer: jest.Mocked<KbIngestionProducer>
  let storage: jest.Mocked<StorageService>
  let llm: jest.Mocked<{ embed: jest.Mock }>

  const tenantId = 'tenant-123'
  const now = new Date()

  const mockKb = {
    id: 'kb-1',
    tenantId,
    name: 'Minha KB',
    description: 'Descricao',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  const mockSource = {
    id: 'source-1',
    knowledgeBaseId: 'kb-1',
    tenantId,
    type: 'TEXT' as const,
    name: 'Texto Manual',
    originalUrl: null,
    fileKey: 'tenants/tenant-123/media/2026-03/abc.txt',
    fileMimeType: 'text/plain',
    status: 'PENDING' as const,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  }

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createSource: jest.fn(),
      updateSourceStatus: jest.fn(),
      deleteSource: jest.fn(),
      findSourceById: jest.fn(),
      saveChunks: jest.fn(),
      deleteChunksBySource: jest.fn(),
      searchSimilarChunks: jest.fn(),
    }

    const mockProducer = {
      enqueue: jest.fn(),
    }

    const mockStorage = {
      uploadMedia: jest.fn(),
      download: jest.fn(),
      getSignedUrl: jest.fn(),
      delete: jest.fn(),
    }

    const mockLlm = {
      chat: jest.fn(),
      stream: jest.fn(),
      embed: jest.fn(),
    }

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
        { provide: KbIngestionProducer, useValue: mockProducer },
        { provide: StorageService, useValue: mockStorage },
        { provide: LLM_PROVIDER, useValue: mockLlm },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile()

    service = module.get(KnowledgeBaseService)
    repository = module.get(KnowledgeBaseRepository)
    producer = module.get(KbIngestionProducer)
    storage = module.get(StorageService)
    llm = module.get(LLM_PROVIDER)
  })

  describe('findAll', () => {
    it('deve retornar lista de knowledge bases', async () => {
      const kbs = [mockKb]
      repository.findAll.mockResolvedValue(kbs as any)

      const result = await service.findAll(tenantId)

      expect(result.data).toEqual(kbs)
      expect(repository.findAll).toHaveBeenCalledWith(tenantId)
    })
  })

  describe('findById', () => {
    it('deve retornar knowledge base quando encontrada', async () => {
      repository.findById.mockResolvedValue({ ...mockKb, sources: [] } as any)

      const result = await service.findById(tenantId, 'kb-1')

      expect(result.data.id).toBe('kb-1')
      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'kb-1')
    })

    it('deve lancar KNOWLEDGE_BASE_NOT_FOUND quando nao encontrada', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.findById(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_BASE_NOT_FOUND' })
    })
  })

  describe('create', () => {
    it('deve criar knowledge base com sucesso', async () => {
      repository.create.mockResolvedValue(mockKb as any)

      const result = await service.create(tenantId, { name: 'Minha KB', description: 'Descricao' })

      expect(result.data).toEqual(mockKb)
      expect(repository.create).toHaveBeenCalledWith(tenantId, {
        name: 'Minha KB',
        description: 'Descricao',
      })
    })
  })

  describe('update', () => {
    it('deve atualizar knowledge base com sucesso', async () => {
      const updated = { ...mockKb, name: 'KB Atualizada' }
      repository.findById.mockResolvedValue({ ...mockKb, sources: [] } as any)
      repository.update.mockResolvedValue(updated as any)

      const result = await service.update(tenantId, 'kb-1', { name: 'KB Atualizada' })

      expect(result.data.name).toBe('KB Atualizada')
    })

    it('deve lancar KNOWLEDGE_BASE_NOT_FOUND quando nao encontrada', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'New' }),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_BASE_NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('deve excluir knowledge base com sucesso', async () => {
      repository.findById.mockResolvedValue({ ...mockKb, sources: [] } as any)
      repository.softDelete.mockResolvedValue(mockKb as any)

      const result = await service.delete(tenantId, 'kb-1')

      expect(result.data.deleted).toBe(true)
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'kb-1')
    })

    it('deve lancar KNOWLEDGE_BASE_NOT_FOUND quando nao encontrada', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.delete(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_BASE_NOT_FOUND' })
    })
  })

  describe('addTextSource', () => {
    it('deve criar source TEXT e enfileirar ingestao', async () => {
      repository.findById.mockResolvedValue({ ...mockKb, sources: [] } as any)
      storage.uploadMedia.mockResolvedValue('tenants/tenant-123/media/2026-03/abc.txt')
      repository.createSource.mockResolvedValue(mockSource as any)
      producer.enqueue.mockResolvedValue(undefined)

      const result = await service.addTextSource(tenantId, 'kb-1', {
        type: 'TEXT',
        name: 'Texto Manual',
        content: 'Conteudo do texto aqui',
      })

      expect(result.data.id).toBe('source-1')
      expect(storage.uploadMedia).toHaveBeenCalledWith(
        tenantId,
        expect.any(Buffer),
        'text/plain',
        'Texto Manual.txt',
      )
      expect(repository.createSource).toHaveBeenCalledWith(
        expect.objectContaining({
          knowledgeBaseId: 'kb-1',
          tenantId,
          type: 'TEXT',
          name: 'Texto Manual',
        }),
      )
      expect(producer.enqueue).toHaveBeenCalledWith({
        sourceId: 'source-1',
        tenantId,
      })
    })

    it('deve lancar KNOWLEDGE_BASE_NOT_FOUND se KB nao existir', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.addTextSource(tenantId, 'nonexistent', {
          type: 'TEXT',
          name: 'Texto',
          content: 'abc',
        }),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_BASE_NOT_FOUND' })
    })
  })

  describe('deleteSource', () => {
    it('deve deletar source e chunks com sucesso', async () => {
      repository.findSourceById.mockResolvedValue(mockSource as any)
      repository.deleteChunksBySource.mockResolvedValue({ count: 5 } as any)
      repository.deleteSource.mockResolvedValue(mockSource as any)

      const result = await service.deleteSource(tenantId, 'kb-1', 'source-1')

      expect(result.data.deleted).toBe(true)
      expect(repository.deleteChunksBySource).toHaveBeenCalledWith('source-1')
      expect(repository.deleteSource).toHaveBeenCalledWith(tenantId, 'kb-1', 'source-1')
    })

    it('deve lancar KNOWLEDGE_SOURCE_NOT_FOUND se source nao existir', async () => {
      repository.findSourceById.mockResolvedValue(null)

      await expect(
        service.deleteSource(tenantId, 'kb-1', 'nonexistent'),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_SOURCE_NOT_FOUND' })
    })
  })

  describe('reIngestSource', () => {
    it('deve re-ingerir source com status FAILED', async () => {
      const failedSource = { ...mockSource, status: 'FAILED' as const }
      repository.findSourceById.mockResolvedValue(failedSource as any)
      repository.updateSourceStatus.mockResolvedValue(failedSource as any)
      producer.enqueue.mockResolvedValue(undefined)

      const result = await service.reIngestSource(tenantId, 'kb-1', 'source-1')

      expect(result.data.reIngested).toBe(true)
      expect(repository.updateSourceStatus).toHaveBeenCalledWith('source-1', 'PENDING')
      expect(producer.enqueue).toHaveBeenCalledWith({
        sourceId: 'source-1',
        tenantId,
      })
    })

    it('deve lancar erro se source nao estiver com status FAILED', async () => {
      const completedSource = { ...mockSource, status: 'COMPLETED' as const }
      repository.findSourceById.mockResolvedValue(completedSource as any)

      await expect(
        service.reIngestSource(tenantId, 'kb-1', 'source-1'),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_SOURCE_REINGEST_INVALID_STATUS' })
    })

    it('deve lancar KNOWLEDGE_SOURCE_NOT_FOUND se source nao existir', async () => {
      repository.findSourceById.mockResolvedValue(null)

      await expect(
        service.reIngestSource(tenantId, 'kb-1', 'nonexistent'),
      ).rejects.toMatchObject({ code: 'KNOWLEDGE_SOURCE_NOT_FOUND' })
    })
  })

  describe('searchContext', () => {
    it('deve retornar contexto de chunks similares', async () => {
      const embedding = [0.1, 0.2, 0.3]
      llm.embed.mockResolvedValue(embedding)
      repository.searchSimilarChunks.mockResolvedValue([
        { id: 'chunk-1', content: 'Conteudo 1', sourceId: 'source-1', similarity: 0.85 },
        { id: 'chunk-2', content: 'Conteudo 2', sourceId: 'source-1', similarity: 0.75 },
      ])

      const context = await service.searchContext(tenantId, ['kb-1'], 'pergunta do usuario')

      expect(context).toContain('Conteudo 1')
      expect(context).toContain('Conteudo 2')
      expect(llm.embed).toHaveBeenCalledWith('pergunta do usuario', undefined)
      expect(repository.searchSimilarChunks).toHaveBeenCalledWith(tenantId, ['kb-1'], embedding, 5)
    })

    it('deve filtrar chunks com similaridade abaixo de 0.7', async () => {
      const embedding = [0.1, 0.2, 0.3]
      llm.embed.mockResolvedValue(embedding)
      repository.searchSimilarChunks.mockResolvedValue([
        { id: 'chunk-1', content: 'Relevante', sourceId: 'source-1', similarity: 0.85 },
        { id: 'chunk-2', content: 'Irrelevante', sourceId: 'source-1', similarity: 0.5 },
      ])

      const context = await service.searchContext(tenantId, ['kb-1'], 'pergunta')

      expect(context).toContain('Relevante')
      expect(context).not.toContain('Irrelevante')
    })
  })
})
