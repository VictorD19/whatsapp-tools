import { Test, TestingModule } from '@nestjs/testing'
import { DealService } from '../deal.service'
import { DealRepository } from '../deal.repository'
import { LoggerService } from '@core/logger/logger.service'
import { PrismaService } from '@core/database/prisma.service'
import { NotificationsService } from '@modules/notifications/notifications.service'
import { Decimal } from '@prisma/client/runtime/library'
import { ConversationStatus } from '@prisma/client'

describe('DealService', () => {
  let service: DealService
  let repository: jest.Mocked<DealRepository>
  let notifications: jest.Mocked<NotificationsService>
  let mockPrisma: { user: { findMany: jest.Mock } }

  const tenantId = 'tenant-123'
  const userId = 'user-456'
  const now = new Date()

  const mockStage = { id: 'stage-1', name: 'Novo Lead', color: '#6B7280', type: 'ACTIVE' as const, order: 1 }
  const mockWonStage = { id: 'stage-won', name: 'Convertido', color: '#22C55E', type: 'WON' as const, order: 6 }
  const mockLostStage = { id: 'stage-lost', name: 'Perdido', color: '#EF4444', type: 'LOST' as const, order: 7 }

  const mockPipeline = { id: 'pipe-1', name: 'Pipeline Padrao' }

  const mockDeal = {
    id: 'deal-1',
    tenantId,
    pipelineId: 'pipe-1',
    stageId: 'stage-1',
    contactId: 'contact-1',
    conversationId: 'conv-1' as string | null,
    title: 'Venda para Joao' as string | null,
    value: new Decimal(1500) as Decimal | null,
    assignedToId: null as string | null,
    wonAt: null as Date | null,
    lostAt: null as Date | null,
    lostReason: null as string | null,
    deletedAt: null as Date | null,
    createdAt: now,
    updatedAt: now,
    contact: { id: 'contact-1', phone: '5511999999999', name: 'Joao' as string | null, avatarUrl: null as string | null },
    stage: mockStage,
    pipeline: mockPipeline,
    conversation: { id: 'conv-1', protocol: 'SCHA1000', status: 'OPEN' as ConversationStatus } as { id: string; protocol: string; status: ConversationStatus } | null,
    assignedTo: null as { id: string; name: string } | null,
  }

  const mockFullStage = {
    id: 'stage-1',
    pipelineId: 'pipe-1',
    name: 'Novo Lead',
    color: '#6B7280',
    type: 'ACTIVE' as const,
    order: 1,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }

  const mockDefaultPipeline = {
    id: 'pipe-1',
    name: 'Pipeline Padrao',
    tenantId,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }

  beforeEach(async () => {
    const mockRepository = {
      findDeals: jest.fn(),
      findDealById: jest.fn(),
      findActiveDealByContact: jest.fn(),
      createDeal: jest.fn(),
      updateDeal: jest.fn(),
      moveDeal: jest.fn(),
      softDeleteDeal: jest.fn(),
      updateConversationId: jest.fn(),
      findDefaultPipeline: jest.fn(),
      findDefaultStage: jest.fn(),
      findStageById: jest.fn(),
      findNotes: jest.fn(),
      createNote: jest.fn(),
    }

    mockPrisma = {
      user: { findMany: jest.fn().mockResolvedValue([]) },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealService,
        { provide: DealRepository, useValue: mockRepository },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: { dispatch: jest.fn() } },
      ],
    }).compile()

    service = module.get(DealService)
    repository = module.get(DealRepository)
    notifications = module.get(NotificationsService)
  })

  describe('findDeals', () => {
    it('should return paginated deals for tenant', async () => {
      repository.findDeals.mockResolvedValue({ deals: [mockDeal], total: 1 })

      const result = await service.findDeals(tenantId, { page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.totalPages).toBe(1)
      expect(repository.findDeals).toHaveBeenCalledWith(tenantId, {
        stageId: undefined,
        assignedToId: undefined,
        contactId: undefined,
        pipelineId: undefined,
        page: 1,
        limit: 20,
      })
    })

    it('should pass filters to repository', async () => {
      repository.findDeals.mockResolvedValue({ deals: [], total: 0 })

      await service.findDeals(tenantId, {
        stageId: 'stage-1',
        pipelineId: 'pipe-1',
        page: 2,
        limit: 10,
      })

      expect(repository.findDeals).toHaveBeenCalledWith(tenantId, {
        stageId: 'stage-1',
        assignedToId: undefined,
        contactId: undefined,
        pipelineId: 'pipe-1',
        page: 2,
        limit: 10,
      })
    })
  })

  describe('findDealById', () => {
    it('should return a deal', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)

      const result = await service.findDealById(tenantId, 'deal-1')

      expect(result).toEqual(mockDeal)
      expect(repository.findDealById).toHaveBeenCalledWith(tenantId, 'deal-1')
    })

    it('should throw DEAL_NOT_FOUND if not found', async () => {
      repository.findDealById.mockResolvedValue(null)

      await expect(service.findDealById(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'DEAL_NOT_FOUND',
      })
    })
  })

  describe('createDeal', () => {
    it('should create a deal with default pipeline and stage', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findDefaultPipeline.mockResolvedValue(mockDefaultPipeline)
      repository.findDefaultStage.mockResolvedValue(mockFullStage)
      repository.createDeal.mockResolvedValue(mockDeal)

      const result = await service.createDeal(tenantId, {
        contactId: 'contact-1',
        title: 'Venda para Joao',
        value: 1500,
        conversationId: 'conv-1',
      })

      expect(result).toEqual(mockDeal)
      expect(repository.createDeal).toHaveBeenCalledWith({
        tenantId,
        pipelineId: 'pipe-1',
        stageId: 'stage-1',
        contactId: 'contact-1',
        conversationId: 'conv-1',
        title: 'Venda para Joao',
        value: 1500,
      })
    })

    it('should create a deal with explicit pipeline and stage', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-2', name: 'Contatado', isDefault: false })
      repository.createDeal.mockResolvedValue(mockDeal)

      await service.createDeal(tenantId, {
        contactId: 'contact-1',
        pipelineId: 'pipe-1',
        stageId: 'stage-2',
      })

      expect(repository.createDeal).toHaveBeenCalledWith(
        expect.objectContaining({ pipelineId: 'pipe-1', stageId: 'stage-2' }),
      )
    })

    it('should throw DEAL_ACTIVE_EXISTS if contact already has an active deal', async () => {
      repository.findActiveDealByContact.mockResolvedValue({
        ...mockDeal,
        stage: { id: 'stage-1', name: 'Novo Lead', type: 'ACTIVE' as const },
      })

      await expect(
        service.createDeal(tenantId, { contactId: 'contact-1' }),
      ).rejects.toMatchObject({ code: 'DEAL_ACTIVE_EXISTS' })
    })

    it('should throw DEAL_STAGE_INVALID_PIPELINE if stage does not belong to pipeline', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-other', pipelineId: 'pipe-other' })

      await expect(
        service.createDeal(tenantId, { contactId: 'contact-1', pipelineId: 'pipe-1', stageId: 'stage-other' }),
      ).rejects.toMatchObject({ code: 'DEAL_STAGE_INVALID_PIPELINE' })
    })

    it('should throw when no default pipeline found', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findDefaultPipeline.mockResolvedValue(null)

      await expect(
        service.createDeal(tenantId, { contactId: 'contact-1' }),
      ).rejects.toMatchObject({ code: 'DEAL_STAGE_INVALID_PIPELINE' })
    })

    it('should throw when no default stage found', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findDefaultPipeline.mockResolvedValue(mockDefaultPipeline)
      repository.findDefaultStage.mockResolvedValue(null)

      await expect(
        service.createDeal(tenantId, { contactId: 'contact-1' }),
      ).rejects.toMatchObject({ code: 'DEAL_STAGE_INVALID_PIPELINE' })
    })
  })

  describe('findOrCreateForContact', () => {
    it('should return existing active deal', async () => {
      repository.findActiveDealByContact.mockResolvedValue({
        ...mockDeal,
        stage: { id: 'stage-1', name: 'Novo Lead', type: 'ACTIVE' as const },
      })

      const result = await service.findOrCreateForContact(tenantId, 'contact-1')

      expect(result).toBeDefined()
      expect(repository.createDeal).not.toHaveBeenCalled()
    })

    it('should update conversationId on existing deal if missing', async () => {
      repository.findActiveDealByContact.mockResolvedValue({
        ...mockDeal,
        conversationId: null,
        stage: { id: 'stage-1', name: 'Novo Lead', type: 'ACTIVE' as const },
      })

      await service.findOrCreateForContact(tenantId, 'contact-1', 'conv-2')

      expect(repository.updateConversationId).toHaveBeenCalledWith('deal-1', 'conv-2')
    })

    it('should create new deal when no active deal exists', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findDefaultPipeline.mockResolvedValue(mockDefaultPipeline)
      repository.findDefaultStage.mockResolvedValue(mockFullStage)
      repository.createDeal.mockResolvedValue(mockDeal)

      const result = await service.findOrCreateForContact(tenantId, 'contact-1', 'conv-1')

      expect(result).toEqual(mockDeal)
      expect(repository.createDeal).toHaveBeenCalledWith({
        tenantId,
        pipelineId: 'pipe-1',
        stageId: 'stage-1',
        contactId: 'contact-1',
        conversationId: 'conv-1',
      })
    })

    it('should return null when no default pipeline exists', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findDefaultPipeline.mockResolvedValue(null)

      const result = await service.findOrCreateForContact(tenantId, 'contact-1')

      expect(result).toBeNull()
      expect(repository.createDeal).not.toHaveBeenCalled()
    })

    it('should return null when no default stage exists', async () => {
      repository.findActiveDealByContact.mockResolvedValue(null)
      repository.findDefaultPipeline.mockResolvedValue(mockDefaultPipeline)
      repository.findDefaultStage.mockResolvedValue(null)

      const result = await service.findOrCreateForContact(tenantId, 'contact-1')

      expect(result).toBeNull()
      expect(repository.createDeal).not.toHaveBeenCalled()
    })
  })

  describe('updateDeal', () => {
    it('should update a deal', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      const updatedDeal = { ...mockDeal, title: 'Atualizado' as string | null, value: new Decimal(2000) as Decimal | null }
      repository.updateDeal.mockResolvedValue(updatedDeal)

      const result = await service.updateDeal(tenantId, 'deal-1', { title: 'Atualizado', value: 2000 })

      expect(result.title).toBe('Atualizado')
      expect(repository.updateDeal).toHaveBeenCalledWith('deal-1', {
        title: 'Atualizado',
        value: 2000,
        assignedToId: undefined,
      })
    })

    it('should dispatch notification when assignedToId is set', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.updateDeal.mockResolvedValue({ ...mockDeal, assignedToId: 'user-789' })

      await service.updateDeal(tenantId, 'deal-1', { assignedToId: 'user-789' })

      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          userId: 'user-789',
          type: 'DEAL_ASSIGNED',
        }),
      )
    })

    it('should not dispatch notification when assignedToId is not set', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.updateDeal.mockResolvedValue(mockDeal)

      await service.updateDeal(tenantId, 'deal-1', { title: 'Novo titulo' })

      expect(notifications.dispatch).not.toHaveBeenCalled()
    })

    it('should throw DEAL_NOT_FOUND if deal does not exist', async () => {
      repository.findDealById.mockResolvedValue(null)

      await expect(
        service.updateDeal(tenantId, 'nonexistent', { title: 'X' }),
      ).rejects.toMatchObject({ code: 'DEAL_NOT_FOUND' })
    })
  })

  describe('moveDeal', () => {
    it('should move deal to an ACTIVE stage', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      const targetStage = { ...mockFullStage, id: 'stage-2', name: 'Contatado', isDefault: false }
      repository.findStageById.mockResolvedValue(targetStage)
      const movedDeal = { ...mockDeal, stageId: 'stage-2', stage: { ...mockStage, id: 'stage-2', name: 'Contatado' } }
      repository.moveDeal.mockResolvedValue(movedDeal)

      const result = await service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-2' })

      expect(repository.moveDeal).toHaveBeenCalledWith('deal-1', {
        stageId: 'stage-2',
        wonAt: null,
        lostAt: null,
        lostReason: null,
      })
      expect(result.stageId).toBe('stage-2')
    })

    it('should set wonAt when moving to WON stage', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-won', name: 'Convertido', type: 'WON' as const, order: 6, isDefault: false })
      repository.moveDeal.mockResolvedValue({ ...mockDeal, stage: mockWonStage, wonAt: now })

      await service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-won' })

      expect(repository.moveDeal).toHaveBeenCalledWith('deal-1', expect.objectContaining({
        stageId: 'stage-won',
        wonAt: expect.any(Date),
        lostAt: null,
        lostReason: null,
      }))
    })

    it('should set lostAt and lostReason when moving to LOST stage', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-lost', name: 'Perdido', type: 'LOST' as const, order: 7, isDefault: false })
      repository.moveDeal.mockResolvedValue({ ...mockDeal, stage: mockLostStage, lostAt: now, lostReason: 'Preco alto' })

      await service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-lost', lostReason: 'Preco alto' })

      expect(repository.moveDeal).toHaveBeenCalledWith('deal-1', expect.objectContaining({
        stageId: 'stage-lost',
        wonAt: null,
        lostAt: expect.any(Date),
        lostReason: 'Preco alto',
      }))
    })

    it('should throw DEAL_ALREADY_CLOSED if deal is in WON stage', async () => {
      const wonDeal = { ...mockDeal, stage: mockWonStage }
      repository.findDealById.mockResolvedValue(wonDeal)

      await expect(
        service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-2' }),
      ).rejects.toMatchObject({ code: 'DEAL_ALREADY_CLOSED' })
    })

    it('should throw DEAL_ALREADY_CLOSED if deal is in LOST stage', async () => {
      const lostDeal = { ...mockDeal, stage: mockLostStage }
      repository.findDealById.mockResolvedValue(lostDeal)

      await expect(
        service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-2' }),
      ).rejects.toMatchObject({ code: 'DEAL_ALREADY_CLOSED' })
    })

    it('should throw DEAL_STAGE_INVALID_PIPELINE if stage belongs to different pipeline', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-other', pipelineId: 'pipe-other' })

      await expect(
        service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-other' }),
      ).rejects.toMatchObject({ code: 'DEAL_STAGE_INVALID_PIPELINE' })
    })

    it('should throw DEAL_STAGE_INVALID_PIPELINE if stage does not exist', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.findStageById.mockResolvedValue(null)

      await expect(
        service.moveDeal(tenantId, 'deal-1', { stageId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'DEAL_STAGE_INVALID_PIPELINE' })
    })

    it('should dispatch DEAL_WON notification to assignee', async () => {
      const assignedDeal = { ...mockDeal, assignedToId: 'user-789' }
      repository.findDealById.mockResolvedValue(assignedDeal)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-won', name: 'Convertido', type: 'WON' as const, order: 6, isDefault: false })
      repository.moveDeal.mockResolvedValue({ ...assignedDeal, stage: mockWonStage, wonAt: now })

      await service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-won' })

      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          userId: 'user-789',
          type: 'DEAL_WON',
        }),
      )
    })

    it('should dispatch DEAL_LOST notification to assignee', async () => {
      const assignedDeal = { ...mockDeal, assignedToId: 'user-789' }
      repository.findDealById.mockResolvedValue(assignedDeal)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-lost', name: 'Perdido', type: 'LOST' as const, order: 7, isDefault: false })
      repository.moveDeal.mockResolvedValue({ ...assignedDeal, stage: mockLostStage, lostAt: now })

      await service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-lost' })

      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          userId: 'user-789',
          type: 'DEAL_LOST',
        }),
      )
    })

    it('should notify admins when deal is WON but has no assignee', async () => {
      repository.findDealById.mockResolvedValue(mockDeal) // assignedToId is null
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-won', name: 'Convertido', type: 'WON' as const, order: 6, isDefault: false })
      repository.moveDeal.mockResolvedValue({ ...mockDeal, stage: mockWonStage, wonAt: now })
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }])

      await service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-won' })

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { tenantId, role: 'admin', deletedAt: null },
        select: { id: true },
      })
      expect(notifications.dispatch).toHaveBeenCalledTimes(2)
    })

    it('should not throw when admin query fails for unassigned deal notification', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.findStageById.mockResolvedValue({ ...mockFullStage, id: 'stage-won', name: 'Convertido', type: 'WON' as const, order: 6, isDefault: false })
      repository.moveDeal.mockResolvedValue({ ...mockDeal, stage: mockWonStage, wonAt: now })
      mockPrisma.user.findMany.mockRejectedValue(new Error('DB error'))

      // Should not throw — notification failure is non-blocking
      await expect(
        service.moveDeal(tenantId, 'deal-1', { stageId: 'stage-won' }),
      ).resolves.toBeDefined()
    })
  })

  describe('deleteDeal', () => {
    it('should soft delete a deal', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      repository.softDeleteDeal.mockResolvedValue({} as never)

      const result = await service.deleteDeal(tenantId, 'deal-1')

      expect(result).toEqual({ data: { message: 'Deal removido com sucesso' } })
      expect(repository.softDeleteDeal).toHaveBeenCalledWith('deal-1')
    })

    it('should throw DEAL_NOT_FOUND if deal does not exist', async () => {
      repository.findDealById.mockResolvedValue(null)

      await expect(service.deleteDeal(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'DEAL_NOT_FOUND',
      })
    })
  })

  describe('createNote', () => {
    it('should create a note for a deal', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      const mockNote = {
        id: 'note-1',
        dealId: 'deal-1',
        tenantId,
        authorId: userId,
        content: 'Cliente interessado',
        createdAt: now,
        updatedAt: now,
        author: { id: userId, name: 'Admin' },
      }
      repository.createNote.mockResolvedValue(mockNote)

      const result = await service.createNote(tenantId, 'deal-1', userId, { content: 'Cliente interessado' })

      expect(result).toEqual(mockNote)
      expect(repository.createNote).toHaveBeenCalledWith({
        dealId: 'deal-1',
        tenantId,
        authorId: userId,
        content: 'Cliente interessado',
      })
    })

    it('should throw DEAL_NOT_FOUND if deal does not exist', async () => {
      repository.findDealById.mockResolvedValue(null)

      await expect(
        service.createNote(tenantId, 'nonexistent', userId, { content: 'Nota' }),
      ).rejects.toMatchObject({ code: 'DEAL_NOT_FOUND' })
    })
  })

  describe('findNotes', () => {
    it('should return notes for a deal', async () => {
      repository.findDealById.mockResolvedValue(mockDeal)
      const mockNotes = [
        { id: 'note-2', dealId: 'deal-1', tenantId, authorId: userId, content: 'Segunda nota', createdAt: now, updatedAt: now, author: { id: userId, name: 'Admin' } },
        { id: 'note-1', dealId: 'deal-1', tenantId, authorId: userId, content: 'Primeira nota', createdAt: now, updatedAt: now, author: { id: userId, name: 'Admin' } },
      ]
      repository.findNotes.mockResolvedValue(mockNotes)

      const result = await service.findNotes(tenantId, 'deal-1')

      expect(result.data).toHaveLength(2)
      expect(repository.findNotes).toHaveBeenCalledWith('deal-1', tenantId)
    })

    it('should throw DEAL_NOT_FOUND if deal does not exist', async () => {
      repository.findDealById.mockResolvedValue(null)

      await expect(service.findNotes(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'DEAL_NOT_FOUND',
      })
    })
  })
})
