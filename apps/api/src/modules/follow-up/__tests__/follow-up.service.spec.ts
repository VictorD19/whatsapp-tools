import { Test, TestingModule } from '@nestjs/testing'
import { FollowUpService } from '../follow-up.service'
import { FollowUpRepository } from '../follow-up.repository'
import { FollowUpProducer } from '../queues/follow-up.producer'
import { StorageService } from '@modules/storage/storage.service'
import { AppException } from '@core/errors/app.exception'

describe('FollowUpService', () => {
  let service: FollowUpService
  let repository: jest.Mocked<FollowUpRepository>
  let producer: jest.Mocked<FollowUpProducer>
  let storage: jest.Mocked<StorageService>

  const tenantId = 'tenant-123'
  const userId = 'user-456'
  const conversationId = 'conv-789'

  const mockFollowUp = {
    id: 'fu-1',
    tenantId,
    conversationId,
    dealId: null,
    createdById: userId,
    type: 'MESSAGE' as const,
    mode: 'REMINDER' as const,
    status: 'PENDING' as const,
    message: null,
    mediaKey: null,
    mediaFilename: null,
    scheduledAt: new Date('2026-12-01T10:00:00Z'),
    notifiedAt: null,
    sentAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: { id: userId, name: 'John' },
    deal: null,
  }

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findByConversation: jest.fn(),
      findById: jest.fn(),
      cancel: jest.fn(),
    }

    const mockProducer = {
      schedule: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
    }

    const mockStorage = {
      uploadMedia: jest.fn().mockResolvedValue('tenants/tenant-123/media/2026-12/uuid.jpg'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpService,
        { provide: FollowUpRepository, useValue: mockRepository },
        { provide: FollowUpProducer, useValue: mockProducer },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile()

    service = module.get(FollowUpService)
    repository = module.get(FollowUpRepository)
    producer = module.get(FollowUpProducer)
    storage = module.get(StorageService)
  })

  describe('create', () => {
    it('should create a follow-up and return wrapped data', async () => {
      repository.create.mockResolvedValue(mockFollowUp)

      const dto = {
        type: 'MESSAGE' as const,
        mode: 'REMINDER' as const,
        scheduledAt: new Date('2026-12-01T10:00:00Z'),
      }

      const result = await service.create(tenantId, conversationId, userId, dto)

      expect(result).toEqual({ data: mockFollowUp })
      expect(repository.create).toHaveBeenCalledWith({
        tenantId,
        conversationId,
        createdById: userId,
        type: 'MESSAGE',
        mode: 'REMINDER',
        scheduledAt: dto.scheduledAt,
        message: undefined,
        mediaKey: undefined,
        mediaFilename: undefined,
      })
    })

    it('should pass message when provided', async () => {
      repository.create.mockResolvedValue({ ...mockFollowUp, message: 'Lembrete de pagamento' })

      const dto = {
        type: 'PAYMENT' as const,
        mode: 'AUTOMATIC' as const,
        scheduledAt: new Date('2026-12-01T10:00:00Z'),
        message: 'Lembrete de pagamento',
      }

      const result = await service.create(tenantId, conversationId, userId, dto)

      expect(result.data.message).toBe('Lembrete de pagamento')
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Lembrete de pagamento' }),
      )
    })

    it('should upload media file and store mediaKey when file provided', async () => {
      const mediaKey = 'tenants/tenant-123/media/2026-12/uuid.jpg'
      storage.uploadMedia.mockResolvedValue(mediaKey)
      repository.create.mockResolvedValue({ ...mockFollowUp, mediaKey, mediaFilename: 'foto.jpg' })

      const dto = {
        type: 'MESSAGE' as const,
        mode: 'AUTOMATIC' as const,
        scheduledAt: new Date('2026-12-01T10:00:00Z'),
      }

      const mediaFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        filename: 'foto.jpg',
      }

      const result = await service.create(tenantId, conversationId, userId, dto, mediaFile)

      expect(storage.uploadMedia).toHaveBeenCalledWith(tenantId, mediaFile.buffer, mediaFile.mimetype, mediaFile.filename)
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ mediaKey, mediaFilename: 'foto.jpg' }),
      )
      expect(result.data.mediaKey).toBe(mediaKey)
    })

    it('should throw FOLLOW_UP_MISSING_CONTENT when AUTOMATIC with no message and no media', async () => {
      const dto = {
        type: 'MESSAGE' as const,
        mode: 'AUTOMATIC' as const,
        scheduledAt: new Date('2026-12-01T10:00:00Z'),
      }

      await expect(service.create(tenantId, conversationId, userId, dto)).rejects.toThrow(AppException)
      await expect(service.create(tenantId, conversationId, userId, dto)).rejects.toMatchObject({
        code: 'FOLLOW_UP_MISSING_CONTENT',
      })
    })
  })

  describe('findByConversation', () => {
    it('should return paginated follow-ups', async () => {
      repository.findByConversation.mockResolvedValue({
        followUps: [mockFollowUp],
        total: 1,
      })

      const result = await service.findByConversation(tenantId, conversationId, {
        page: 1,
        limit: 20,
      })

      expect(result.data).toHaveLength(1)
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
      expect(repository.findByConversation).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        { status: undefined, page: 1, limit: 20 },
      )
    })

    it('should filter by status when provided', async () => {
      repository.findByConversation.mockResolvedValue({
        followUps: [],
        total: 0,
      })

      await service.findByConversation(tenantId, conversationId, {
        status: 'PENDING',
        page: 1,
        limit: 10,
      })

      expect(repository.findByConversation).toHaveBeenCalledWith(
        tenantId,
        conversationId,
        { status: 'PENDING', page: 1, limit: 10 },
      )
    })

    it('should calculate totalPages correctly', async () => {
      repository.findByConversation.mockResolvedValue({
        followUps: Array(20).fill(mockFollowUp),
        total: 55,
      })

      const result = await service.findByConversation(tenantId, conversationId, {
        page: 1,
        limit: 20,
      })

      expect(result.meta.totalPages).toBe(3)
    })
  })

  describe('cancel', () => {
    it('should cancel a pending follow-up', async () => {
      const pending = { ...mockFollowUp, status: 'PENDING' as const }
      const cancelled = {
        ...pending,
        status: 'CANCELLED' as const,
        cancelledAt: new Date(),
      }

      repository.findById.mockResolvedValue(pending)
      repository.cancel.mockResolvedValue(cancelled)

      const result = await service.cancel(tenantId, 'fu-1')

      expect(result).toEqual({ data: cancelled })
      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'fu-1')
      expect(repository.cancel).toHaveBeenCalledWith(tenantId, 'fu-1')
    })

    it('should cancel a notified follow-up', async () => {
      const notified = { ...mockFollowUp, status: 'NOTIFIED' as const }
      const cancelled = {
        ...notified,
        status: 'CANCELLED' as const,
        cancelledAt: new Date(),
      }

      repository.findById.mockResolvedValue(notified)
      repository.cancel.mockResolvedValue(cancelled)

      const result = await service.cancel(tenantId, 'fu-1')

      expect(result).toEqual({ data: cancelled })
    })

    it('should throw FOLLOW_UP_NOT_FOUND when follow-up does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.cancel(tenantId, 'fu-999')).rejects.toThrow(AppException)
      await expect(service.cancel(tenantId, 'fu-999')).rejects.toMatchObject({
        code: 'FOLLOW_UP_NOT_FOUND',
      })
    })

    it('should throw FOLLOW_UP_ALREADY_CANCELLED when already cancelled', async () => {
      repository.findById.mockResolvedValue({
        ...mockFollowUp,
        status: 'CANCELLED' as const,
        cancelledAt: new Date(),
      })

      await expect(service.cancel(tenantId, 'fu-1')).rejects.toThrow(AppException)
      await expect(service.cancel(tenantId, 'fu-1')).rejects.toMatchObject({
        code: 'FOLLOW_UP_ALREADY_CANCELLED',
      })
    })

    it('should throw FOLLOW_UP_ALREADY_SENT when already sent', async () => {
      repository.findById.mockResolvedValue({
        ...mockFollowUp,
        status: 'SENT' as const,
        sentAt: new Date(),
      })

      await expect(service.cancel(tenantId, 'fu-1')).rejects.toThrow(AppException)
      await expect(service.cancel(tenantId, 'fu-1')).rejects.toMatchObject({
        code: 'FOLLOW_UP_ALREADY_SENT',
      })
    })
  })
})
