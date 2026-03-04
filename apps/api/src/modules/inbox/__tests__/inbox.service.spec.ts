import { Test, TestingModule } from '@nestjs/testing'
import { InboxService } from '../inbox.service'
import { InboxRepository } from '../inbox.repository'
import { InboxGateway } from '../inbox.gateway'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstancesService } from '@modules/instances/instances.service'
import { ConversationImportProducer } from '../queues/import.producer'
import { LoggerService } from '@core/logger/logger.service'
import { AppException } from '@core/errors/app.exception'

describe('InboxService', () => {
  let service: InboxService
  let repository: jest.Mocked<InboxRepository>
  let gateway: jest.Mocked<InboxGateway>
  let whatsapp: jest.Mocked<WhatsAppService>

  const tenantId = 'tenant-123'
  const userId = 'user-456'

  const mockConversation = {
    id: 'conv-1',
    tenantId,
    instanceId: 'inst-1',
    contactId: 'contact-1',
    assignedToId: null as string | null,
    protocol: 'SCHA1000',
    status: 'PENDING' as const,
    tags: [],
    summary: null,
    unreadCount: 1,
    lastMessageAt: new Date(),
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    contact: { id: 'contact-1', phone: '5511999999999', name: 'John', avatarUrl: null },
    instance: { id: 'inst-1', name: 'vendas', evolutionId: 'acme-vendas' },
    assignedTo: null,
    messages: [],
    deals: [],
  }

  beforeEach(async () => {
    const mockRepository = {
      findConversations: jest.fn(),
      findConversationById: jest.fn(),
      findActiveConversation: jest.fn(),
      createConversation: jest.fn(),
      assignConversation: jest.fn(),
      closeConversation: jest.fn(),
      transferConversation: jest.fn(),
      reopenConversation: jest.fn(),
      incrementUnreadCount: jest.fn(),
      updateLastMessageAt: jest.fn(),
      findMessages: jest.fn(),
      createMessage: jest.fn(),
      updateMessageStatusByEvolutionId: jest.fn(),
    }

    const mockGateway = {
      emitConversationCreated: jest.fn(),
      emitNewMessage: jest.fn(),
      emitConversationAssigned: jest.fn(),
      emitConversationClosed: jest.fn(),
      emitConversationTransferred: jest.fn(),
      emitMessageStatusUpdated: jest.fn(),
    }

    const mockWhatsapp = {
      sendText: jest.fn(),
    }

    const mockInstancesService = {
      findOne: jest.fn(),
    }

    const mockImportProducer = {
      startImport: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: InboxRepository, useValue: mockRepository },
        { provide: InboxGateway, useValue: mockGateway },
        { provide: WhatsAppService, useValue: mockWhatsapp },
        { provide: InstancesService, useValue: mockInstancesService },
        { provide: ConversationImportProducer, useValue: mockImportProducer },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile()

    service = module.get(InboxService)
    repository = module.get(InboxRepository)
    gateway = module.get(InboxGateway)
    whatsapp = module.get(WhatsAppService)
  })

  describe('findConversations', () => {
    it('should return paginated conversations', async () => {
      repository.findConversations.mockResolvedValue({
        conversations: [mockConversation],
        total: 1,
      })

      const result = await service.findConversations(tenantId, {
        page: 1,
        limit: 20,
      })

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(repository.findConversations).toHaveBeenCalledWith(tenantId, {
        status: undefined,
        statusNot: undefined,
        assignedToId: undefined,
        unassigned: false,
        instanceId: undefined,
        page: 1,
        limit: 20,
      })
    })

    it('should resolve assignedToMe=true to assignedToId=userId', async () => {
      repository.findConversations.mockResolvedValue({
        conversations: [],
        total: 0,
      })

      await service.findConversations(
        tenantId,
        { assignedToMe: true, page: 1, limit: 20 },
        userId,
      )

      expect(repository.findConversations).toHaveBeenCalledWith(tenantId, {
        status: undefined,
        statusNot: undefined,
        assignedToId: userId,
        unassigned: false,
        instanceId: undefined,
        page: 1,
        limit: 20,
      })
    })
  })

  describe('findConversationById', () => {
    it('should return a conversation', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)

      const result = await service.findConversationById(tenantId, 'conv-1')

      expect(result).toEqual(mockConversation)
    })

    it('should throw CONVERSATION_NOT_FOUND if not found', async () => {
      repository.findConversationById.mockResolvedValue(null)

      await expect(service.findConversationById(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'CONVERSATION_NOT_FOUND',
      })
    })
  })

  describe('assignConversation', () => {
    it('should assign a PENDING conversation', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)
      repository.assignConversation.mockResolvedValue({
        ...mockConversation,
        assignedToId: userId,
        status: 'OPEN' as const,
      })

      const result = await service.assignConversation(tenantId, 'conv-1', userId)

      expect(result.assignedToId).toBe(userId)
      expect(result.status).toBe('OPEN')
      expect(gateway.emitConversationAssigned).toHaveBeenCalledWith(tenantId, {
        conversationId: 'conv-1',
        assignedToId: userId,
        status: 'OPEN',
      })
    })

    it('should throw CONVERSATION_NOT_PENDING if not PENDING', async () => {
      repository.findConversationById.mockResolvedValue({
        ...mockConversation,
        status: 'OPEN' as const,
      })

      await expect(
        service.assignConversation(tenantId, 'conv-1', userId),
      ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_PENDING' })
    })

    it('should throw CONVERSATION_ALREADY_ASSIGNED if already assigned', async () => {
      repository.findConversationById.mockResolvedValue({
        ...mockConversation,
        assignedToId: 'other-user',
      })

      await expect(
        service.assignConversation(tenantId, 'conv-1', userId),
      ).rejects.toMatchObject({ code: 'CONVERSATION_ALREADY_ASSIGNED' })
    })
  })

  describe('sendMessage', () => {
    const openConversation = {
      ...mockConversation,
      status: 'OPEN' as const,
      assignedToId: userId,
    }

    it('should send message and emit WebSocket event', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      whatsapp.sendText.mockResolvedValue({ messageId: 'evo-msg-1', status: 'sent' })
      repository.createMessage.mockResolvedValue({
        id: 'msg-1',
        tenantId,
        conversationId: 'conv-1',
        fromMe: true,
        fromBot: false,
        body: 'Hello',
        type: 'TEXT' as const,
        status: 'SENT' as const,
        evolutionId: 'evo-msg-1',
        mediaUrl: null,
        quotedMessageId: null,
        quotedMessage: null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      const result = await service.sendMessage(tenantId, 'conv-1', userId, { body: 'Hello' })

      expect(result.body).toBe('Hello')
      expect(whatsapp.sendText).toHaveBeenCalledWith('acme-vendas', '5511999999999', 'Hello', { quotedMessageEvolutionId: undefined })
      expect(repository.updateLastMessageAt).toHaveBeenCalledWith('conv-1')
      expect(gateway.emitNewMessage).toHaveBeenCalled()
    })

    it('should allow admin to send in any open conversation', async () => {
      const otherUserConversation = {
        ...openConversation,
        assignedToId: 'other-user',
      }
      repository.findConversationById.mockResolvedValue(otherUserConversation)
      whatsapp.sendText.mockResolvedValue({ messageId: 'evo-msg-2', status: 'sent' })
      repository.createMessage.mockResolvedValue({
        id: 'msg-2',
        tenantId,
        conversationId: 'conv-1',
        fromMe: true,
        fromBot: false,
        body: 'Admin message',
        type: 'TEXT' as const,
        status: 'SENT' as const,
        evolutionId: 'evo-msg-2',
        mediaUrl: null,
        quotedMessageId: null,
        quotedMessage: null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      const result = await service.sendMessage(
        tenantId,
        'conv-1',
        userId,
        { body: 'Admin message' },
        'admin',
      )

      expect(result.body).toBe('Admin message')
    })

    it('should throw CONVERSATION_NOT_OPEN if not OPEN', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)

      await expect(
        service.sendMessage(tenantId, 'conv-1', userId, { body: 'Hello' }),
      ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_OPEN' })
    })

    it('should throw CONVERSATION_ALREADY_ASSIGNED if not assigned to user', async () => {
      repository.findConversationById.mockResolvedValue({
        ...openConversation,
        assignedToId: 'other-user',
      })

      await expect(
        service.sendMessage(tenantId, 'conv-1', userId, { body: 'Hello' }),
      ).rejects.toMatchObject({ code: 'CONVERSATION_ALREADY_ASSIGNED' })
    })

    it('should throw MESSAGE_SEND_FAILED on WhatsApp error', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      whatsapp.sendText.mockRejectedValue(new Error('Connection lost'))

      await expect(
        service.sendMessage(tenantId, 'conv-1', userId, { body: 'Hello' }),
      ).rejects.toMatchObject({ code: 'MESSAGE_SEND_FAILED' })
    })
  })

  describe('closeConversation', () => {
    it('should close an OPEN conversation', async () => {
      const openConv = { ...mockConversation, status: 'OPEN' as const, assignedToId: userId }
      repository.findConversationById.mockResolvedValue(openConv)
      repository.closeConversation.mockResolvedValue({
        ...openConv,
        status: 'CLOSE' as const,
        closedAt: new Date(),
      })

      const result = await service.closeConversation(tenantId, 'conv-1', userId)

      expect(result.status).toBe('CLOSE')
      expect(gateway.emitConversationClosed).toHaveBeenCalledWith(tenantId, {
        conversationId: 'conv-1',
        closedBy: userId,
      })
    })

    it('should throw CONVERSATION_ALREADY_CLOSED if already closed', async () => {
      repository.findConversationById.mockResolvedValue({
        ...mockConversation,
        status: 'CLOSE' as const,
      })

      await expect(
        service.closeConversation(tenantId, 'conv-1', userId),
      ).rejects.toMatchObject({ code: 'CONVERSATION_ALREADY_CLOSED' })
    })
  })

  describe('transferConversation', () => {
    it('should transfer conversation to new user', async () => {
      const openConv = { ...mockConversation, status: 'OPEN' as const, assignedToId: userId }
      repository.findConversationById.mockResolvedValue(openConv)
      repository.transferConversation.mockResolvedValue({
        ...openConv,
        assignedToId: 'new-user',
      })

      const result = await service.transferConversation(tenantId, 'conv-1', 'new-user')

      expect(result.assignedToId).toBe('new-user')
      expect(gateway.emitConversationTransferred).toHaveBeenCalledWith(tenantId, {
        conversationId: 'conv-1',
        previousAssignedToId: userId,
        newAssignedToId: 'new-user',
      })
    })

    it('should throw CONVERSATION_ALREADY_CLOSED if closed', async () => {
      repository.findConversationById.mockResolvedValue({
        ...mockConversation,
        status: 'CLOSE' as const,
      })

      await expect(
        service.transferConversation(tenantId, 'conv-1', 'new-user'),
      ).rejects.toMatchObject({ code: 'CONVERSATION_ALREADY_CLOSED' })
    })
  })

  describe('reopenConversation', () => {
    it('should reopen a CLOSE conversation', async () => {
      repository.findConversationById.mockResolvedValue({
        ...mockConversation,
        status: 'CLOSE' as const,
      })
      repository.reopenConversation.mockResolvedValue({
        ...mockConversation,
        status: 'PENDING' as const,
        assignedToId: null,
      })

      const result = await service.reopenConversation(tenantId, 'conv-1')

      expect(result.status).toBe('PENDING')
      expect(gateway.emitConversationCreated).toHaveBeenCalled()
    })

    it('should throw if conversation is not CLOSE', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)

      await expect(
        service.reopenConversation(tenantId, 'conv-1'),
      ).rejects.toThrow(AppException)
    })
  })
})
