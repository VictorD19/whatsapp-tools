import { Test, TestingModule } from '@nestjs/testing'
import { BroadcastsService } from '../broadcasts.service'
import { BroadcastsRepository } from '../broadcasts.repository'
import { BroadcastProducer } from '../queues/broadcast.producer'
import { StorageService } from '@modules/storage/storage.service'
import { LoggerService } from '@core/logger/logger.service'
import type { CreateBroadcastDto, VariationInput } from '../dto/create-broadcast.dto'

describe('BroadcastsService', () => {
  let service: BroadcastsService
  let repository: jest.Mocked<BroadcastsRepository>
  let producer: jest.Mocked<BroadcastProducer>

  const tenantId = 'tenant-123'
  const userId = 'user-456'

  const mockPlan = {
    id: 'plan-1',
    name: 'Pro',
    slug: 'pro',
    description: null,
    benefits: [],
    maxInstances: 3,
    maxUsers: 5,
    maxAssistants: 1,
    maxBroadcastsPerDay: 5,
    maxContactsPerBroadcast: 500,
    price: null,
    isDefault: false,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockInstance = {
    id: 'inst-1',
    name: 'Vendas',
    evolutionId: 'acme-vendas',
    status: 'CONNECTED' as const,
    defaultAssistantId: null as string | null,
  }

  const mockBroadcast = {
    id: 'bc-1',
    tenantId,
    createdById: userId,
    name: 'Campanha Teste',
    status: 'RUNNING' as const,
    messageType: 'TEXT' as const,
    messageTexts: ['Olá {{nome}}!', 'Oi {{nome}}, tudo bem?'],
    mediaUrl: null,
    caption: null,
    fileName: null,
    delay: 5,
    totalCount: 100,
    sentCount: 0,
    failedCount: 0,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    instances: [{ broadcastId: 'bc-1', instanceId: 'inst-1', instance: mockInstance }],
    sources: [],
    variations: [
      { id: 'v1', messageType: 'TEXT' as const, text: 'Olá {{nome}}!', mediaUrl: null, fileName: null, sortOrder: 0, broadcastId: 'bc-1', createdAt: new Date() },
      { id: 'v2', messageType: 'TEXT' as const, text: 'Oi {{nome}}, tudo bem?', mediaUrl: null, fileName: null, sortOrder: 1, broadcastId: 'bc-1', createdAt: new Date() },
    ],
    createdBy: { id: userId, name: 'Admin' },
    _count: { recipients: 100 },
  }

  const baseDto: CreateBroadcastDto = {
    name: 'Campanha Teste',
    instanceIds: ['inst-1'],
    contactListIds: ['list-1'],
    groups: [],
    delay: 5,
  }

  const baseVariations: VariationInput[] = [
    { messageType: 'TEXT', text: 'Olá {{nome}}!' },
    { messageType: 'TEXT', text: 'Oi {{nome}}, tudo bem?' },
  ]

  beforeEach(async () => {
    const mockRepository = {
      getTenantTimezone: jest.fn().mockResolvedValue('America/Sao_Paulo'),
      getTenantPlan: jest.fn(),
      countTodayBroadcasts: jest.fn(),
      findInstancesByIds: jest.fn(),
      resolveContactListRecipients: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      findByIdWithInstances: jest.fn(),
      updateStatus: jest.fn(),
      incrementCounters: jest.fn(),
      findPendingRecipients: jest.fn(),
      updateRecipientStatus: jest.fn(),
      getRecipientStats: jest.fn(),
      findScheduledReady: jest.fn(),
      getStatus: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    }

    const mockProducer = {
      enqueue: jest.fn(),
      removeJob: jest.fn(),
    }

    const mockStorage = {
      uploadMedia: jest.fn(),
      getSignedUrl: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        { provide: BroadcastsRepository, useValue: mockRepository },
        { provide: BroadcastProducer, useValue: mockProducer },
        { provide: StorageService, useValue: mockStorage },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(BroadcastsService)
    repository = module.get(BroadcastsRepository)
    producer = module.get(BroadcastProducer)
  })

  describe('create', () => {
    it('should create broadcast with RUNNING status when no scheduledAt', async () => {
      repository.getTenantPlan.mockResolvedValue(mockPlan)
      repository.countTodayBroadcasts.mockResolvedValue(0)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([
        { contactId: 'c1', phone: '5511999999999', name: 'John' },
        { contactId: 'c2', phone: '5511888888888', name: 'Jane' },
      ])
      repository.create.mockResolvedValue(mockBroadcast as never)
      producer.enqueue.mockResolvedValue({} as never)

      const result = await service.create(tenantId, userId, baseDto, baseVariations)

      expect(result.data.id).toBe('bc-1')
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Campanha Teste',
          status: 'RUNNING',
          delay: 5,
          variationRecords: expect.arrayContaining([
            expect.objectContaining({ messageType: 'TEXT', text: 'Olá {{nome}}!', sortOrder: 0 }),
          ]),
        }),
      )
      expect(producer.enqueue).toHaveBeenCalledWith('bc-1', tenantId, undefined)
    })

    it('should create broadcast with SCHEDULED status when scheduledAt provided', async () => {
      const scheduledAt = '2026-04-01T10:00'

      repository.getTenantPlan.mockResolvedValue(mockPlan)
      repository.countTodayBroadcasts.mockResolvedValue(0)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([
        { contactId: 'c1', phone: '5511999999999', name: 'John' },
      ])
      repository.create.mockResolvedValue({
        ...mockBroadcast,
        status: 'SCHEDULED',
        scheduledAt: new Date(scheduledAt),
      } as never)
      producer.enqueue.mockResolvedValue({} as never)

      await service.create(tenantId, userId, { ...baseDto, scheduledAt }, baseVariations)

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SCHEDULED' }),
      )
      expect(producer.enqueue).toHaveBeenCalledWith(
        expect.any(String),
        tenantId,
        expect.any(Number),
      )
    })

    it('should throw BROADCAST_NO_VARIATIONS when empty variations', async () => {
      await expect(service.create(tenantId, userId, baseDto, [])).rejects.toMatchObject({
        code: 'BROADCAST_NO_VARIATIONS',
      })
    })

    it('should throw BROADCAST_DAILY_LIMIT when limit exceeded', async () => {
      repository.getTenantPlan.mockResolvedValue({ ...mockPlan, maxBroadcastsPerDay: 2 })
      repository.countTodayBroadcasts.mockResolvedValue(2)

      await expect(service.create(tenantId, userId, baseDto, baseVariations)).rejects.toMatchObject({
        code: 'BROADCAST_DAILY_LIMIT',
      })
    })

    it('should throw BROADCAST_CONTACT_LIMIT when too many recipients', async () => {
      repository.getTenantPlan.mockResolvedValue({ ...mockPlan, maxContactsPerBroadcast: 1 })
      repository.countTodayBroadcasts.mockResolvedValue(0)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([
        { contactId: 'c1', phone: '5511999999999', name: 'John' },
        { contactId: 'c2', phone: '5511888888888', name: 'Jane' },
      ])

      await expect(service.create(tenantId, userId, baseDto, baseVariations)).rejects.toMatchObject({
        code: 'BROADCAST_CONTACT_LIMIT',
      })
    })

    it('should throw BROADCAST_NO_CONNECTED_INSTANCE when no instance connected', async () => {
      repository.getTenantPlan.mockResolvedValue(mockPlan)
      repository.countTodayBroadcasts.mockResolvedValue(0)
      repository.findInstancesByIds.mockResolvedValue([
        { ...mockInstance, status: 'DISCONNECTED' as const },
      ])

      await expect(service.create(tenantId, userId, baseDto, baseVariations)).rejects.toMatchObject({
        code: 'BROADCAST_NO_CONNECTED_INSTANCE',
      })
    })

    it('should throw BROADCAST_EMPTY_LIST when no recipients and no groups', async () => {
      repository.getTenantPlan.mockResolvedValue(mockPlan)
      repository.countTodayBroadcasts.mockResolvedValue(0)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([])

      await expect(
        service.create(tenantId, userId, { ...baseDto, groups: [] }, baseVariations),
      ).rejects.toMatchObject({ code: 'BROADCAST_EMPTY_LIST' })
    })

    it('should deduplicate recipients by phone', async () => {
      repository.getTenantPlan.mockResolvedValue(mockPlan)
      repository.countTodayBroadcasts.mockResolvedValue(0)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([
        { contactId: 'c1', phone: '5511999999999', name: 'John' },
        { contactId: 'c1-dup', phone: '5511999999999', name: 'John Duplicate' },
        { contactId: 'c2', phone: '5511888888888', name: 'Jane' },
      ])
      repository.create.mockResolvedValue(mockBroadcast as never)
      producer.enqueue.mockResolvedValue({} as never)

      await service.create(tenantId, userId, baseDto, baseVariations)

      const createCall = repository.create.mock.calls[0][0]
      expect(createCall.recipients).toHaveLength(2)
    })
  })

  describe('pause', () => {
    it('should pause a RUNNING broadcast', async () => {
      repository.findById.mockResolvedValue(mockBroadcast as never)
      repository.updateStatus.mockResolvedValue({ ...mockBroadcast, status: 'PAUSED' } as never)

      const result = await service.pause(tenantId, 'bc-1')

      expect(result.data.status).toBe('PAUSED')
      expect(repository.updateStatus).toHaveBeenCalledWith('bc-1', 'PAUSED')
    })

    it('should throw BROADCAST_CANNOT_PAUSE if not RUNNING', async () => {
      repository.findById.mockResolvedValue({
        ...mockBroadcast,
        status: 'COMPLETED',
      } as never)

      await expect(service.pause(tenantId, 'bc-1')).rejects.toMatchObject({
        code: 'BROADCAST_CANNOT_PAUSE',
      })
    })

    it('should throw BROADCAST_NOT_FOUND for invalid id', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.pause(tenantId, 'invalid')).rejects.toMatchObject({
        code: 'BROADCAST_NOT_FOUND',
      })
    })
  })

  describe('resume', () => {
    it('should resume a PAUSED broadcast and re-enqueue', async () => {
      repository.findById.mockResolvedValue({
        ...mockBroadcast,
        status: 'PAUSED',
      } as never)
      repository.updateStatus.mockResolvedValue({ ...mockBroadcast, status: 'RUNNING' } as never)
      producer.enqueue.mockResolvedValue({} as never)

      const result = await service.resume(tenantId, 'bc-1')

      expect(result.data.status).toBe('RUNNING')
      expect(repository.updateStatus).toHaveBeenCalledWith('bc-1', 'RUNNING')
      expect(producer.enqueue).toHaveBeenCalledWith('bc-1', tenantId)
    })

    it('should throw BROADCAST_CANNOT_RESUME if not PAUSED', async () => {
      repository.findById.mockResolvedValue(mockBroadcast as never)

      await expect(service.resume(tenantId, 'bc-1')).rejects.toMatchObject({
        code: 'BROADCAST_CANNOT_RESUME',
      })
    })
  })

  describe('cancel', () => {
    it('should cancel a SCHEDULED broadcast and remove job', async () => {
      repository.findById.mockResolvedValue({
        ...mockBroadcast,
        status: 'SCHEDULED',
      } as never)
      repository.updateStatus.mockResolvedValue({
        ...mockBroadcast,
        status: 'CANCELLED',
      } as never)
      producer.removeJob.mockResolvedValue(undefined)

      const result = await service.cancel(tenantId, 'bc-1')

      expect(result.data.status).toBe('CANCELLED')
      expect(producer.removeJob).toHaveBeenCalledWith('bc-1')
    })

    it('should cancel a RUNNING broadcast', async () => {
      repository.findById.mockResolvedValue(mockBroadcast as never)
      repository.updateStatus.mockResolvedValue({
        ...mockBroadcast,
        status: 'CANCELLED',
      } as never)

      const result = await service.cancel(tenantId, 'bc-1')

      expect(result.data.status).toBe('CANCELLED')
    })

    it('should throw BROADCAST_CANNOT_CANCEL if already completed', async () => {
      repository.findById.mockResolvedValue({
        ...mockBroadcast,
        status: 'COMPLETED',
      } as never)

      await expect(service.cancel(tenantId, 'bc-1')).rejects.toMatchObject({
        code: 'BROADCAST_CANNOT_CANCEL',
      })
    })
  })

  describe('list', () => {
    it('should return paginated list', async () => {
      repository.findMany.mockResolvedValue({
        broadcasts: [mockBroadcast as never],
        total: 1,
      })

      const result = await service.list(tenantId, { page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.totalPages).toBe(1)
    })

    it('should pass status filter', async () => {
      repository.findMany.mockResolvedValue({ broadcasts: [], total: 0 })

      await service.list(tenantId, { page: 1, limit: 20, status: 'RUNNING' })

      expect(repository.findMany).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        status: 'RUNNING',
      })
    })
  })

  describe('findOne', () => {
    it('should return broadcast with stats', async () => {
      repository.findById.mockResolvedValue(mockBroadcast as never)
      repository.getRecipientStats.mockResolvedValue({ PENDING: 50, SENT: 40, FAILED: 10 })

      const result = await service.findOne(tenantId, 'bc-1')

      expect(result.data.id).toBe('bc-1')
      expect(result.data.recipientStats).toEqual({ PENDING: 50, SENT: 40, FAILED: 10 })
    })

    it('should throw BROADCAST_NOT_FOUND', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.findOne(tenantId, 'invalid')).rejects.toMatchObject({
        code: 'BROADCAST_NOT_FOUND',
      })
    })
  })

  describe('update', () => {
    const scheduledBroadcast = {
      ...mockBroadcast,
      status: 'SCHEDULED' as const,
      scheduledAt: new Date(Date.now() + 3600000),
    }

    it('should update a SCHEDULED broadcast', async () => {
      repository.findById.mockResolvedValue(scheduledBroadcast as never)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([
        { contactId: 'c1', phone: '5511999999999', name: 'John' },
      ])
      repository.update.mockResolvedValue({ ...scheduledBroadcast, name: 'Updated' } as never)
      producer.removeJob.mockResolvedValue(undefined)
      producer.enqueue.mockResolvedValue({} as never)

      const scheduledAt = '2026-04-01T12:00'
      const result = await service.update(tenantId, 'bc-1', { ...baseDto, scheduledAt }, baseVariations)

      expect(result.data.name).toBe('Updated')
      expect(producer.removeJob).toHaveBeenCalledWith('bc-1')
      expect(repository.update).toHaveBeenCalledWith(
        'bc-1',
        expect.objectContaining({ name: 'Campanha Teste', status: 'SCHEDULED' }),
      )
    })

    it('should throw BROADCAST_NOT_FOUND when broadcast does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'invalid', baseDto, baseVariations),
      ).rejects.toMatchObject({ code: 'BROADCAST_NOT_FOUND' })
    })

    it('should throw BROADCAST_CANNOT_EDIT for RUNNING broadcast', async () => {
      repository.findById.mockResolvedValue(mockBroadcast as never) // status = RUNNING

      await expect(
        service.update(tenantId, 'bc-1', baseDto, baseVariations),
      ).rejects.toMatchObject({ code: 'BROADCAST_CANNOT_EDIT' })
    })

    it('should throw BROADCAST_NO_VARIATIONS when empty variations', async () => {
      repository.findById.mockResolvedValue(scheduledBroadcast as never)

      await expect(
        service.update(tenantId, 'bc-1', baseDto, []),
      ).rejects.toMatchObject({ code: 'BROADCAST_NO_VARIATIONS' })
    })

    it('should keep existing media when no new file uploaded', async () => {
      repository.findById.mockResolvedValue(scheduledBroadcast as never)
      repository.findInstancesByIds.mockResolvedValue([mockInstance])
      repository.resolveContactListRecipients.mockResolvedValue([
        { contactId: 'c1', phone: '5511999999999', name: 'John' },
      ])
      repository.update.mockResolvedValue(scheduledBroadcast as never)
      producer.removeJob.mockResolvedValue(undefined)

      const variations: VariationInput[] = [{
        messageType: 'IMAGE',
        text: 'Legenda',
        existingMediaUrl: 'tenants/t1/media/img.jpg',
        existingFileName: 'foto.jpg',
      }]

      await service.update(tenantId, 'bc-1', baseDto, variations)

      expect(repository.update).toHaveBeenCalledWith(
        'bc-1',
        expect.objectContaining({
          variationRecords: expect.arrayContaining([
            expect.objectContaining({
              mediaUrl: 'tenants/t1/media/img.jpg',
              fileName: 'foto.jpg',
            }),
          ]),
        }),
      )
    })
  })

  describe('delete', () => {
    it('should throw BROADCAST_CANNOT_DELETE if COMPLETED', async () => {
      repository.findById.mockResolvedValue({
        ...mockBroadcast,
        status: 'COMPLETED',
      } as never)

      await expect(service.delete(tenantId, 'bc-1')).rejects.toMatchObject({
        code: 'BROADCAST_CANNOT_DELETE',
      })
    })

    it('should throw BROADCAST_CANNOT_DELETE if RUNNING', async () => {
      repository.findById.mockResolvedValue(mockBroadcast as never)

      await expect(service.delete(tenantId, 'bc-1')).rejects.toMatchObject({
        code: 'BROADCAST_CANNOT_DELETE',
      })
    })

    it('should remove job when deleting SCHEDULED broadcast', async () => {
      repository.findById.mockResolvedValue({
        ...mockBroadcast,
        status: 'SCHEDULED',
      } as never)
      repository.softDelete.mockResolvedValue({ count: 1 } as never)
      producer.removeJob.mockResolvedValue(undefined)

      await service.delete(tenantId, 'bc-1')

      expect(producer.removeJob).toHaveBeenCalledWith('bc-1')
    })
  })
})
