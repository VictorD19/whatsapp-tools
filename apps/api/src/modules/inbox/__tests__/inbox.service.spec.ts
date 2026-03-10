import { Test, TestingModule } from '@nestjs/testing'
import { InboxService } from '../inbox.service'
import { InboxRepository } from '../inbox.repository'
import { InboxGateway } from '../inbox.gateway'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstancesService } from '@modules/instances/instances.service'
import { ConversationImportProducer } from '../queues/import.producer'
import { StorageService } from '@modules/storage/storage.service'
import { LoggerService } from '@core/logger/logger.service'
import { DealService } from '@modules/deal/deal.service'
import { NotificationsService } from '@modules/notifications/notifications.service'
import { ContactsService } from '@modules/contacts/contacts.service'
import { TenantsService } from '@modules/tenants/tenants.service'
import { AppException } from '@core/errors/app.exception'

describe('InboxService', () => {
  let service: InboxService
  let repository: jest.Mocked<InboxRepository>
  let gateway: jest.Mocked<InboxGateway>
  let whatsapp: jest.Mocked<WhatsAppService>
  let instancesService: jest.Mocked<InstancesService>
  let importProducer: jest.Mocked<ConversationImportProducer>
  let storage: jest.Mocked<StorageService>

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
    assistantId: null,
    assistantPausedAt: null,
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
      createManyMessages: jest.fn(),
      findExistingEvolutionIds: jest.fn(),
      findMessageById: jest.fn(),
      findMessageWithInstance: jest.fn(),
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
      sendImage: jest.fn(),
      sendVideo: jest.fn(),
      sendAudio: jest.fn(),
      sendDocument: jest.fn(),
      sendGroupMention: jest.fn(),
      getGroupMembers: jest.fn(),
      findMessages: jest.fn(),
      getMediaBase64: jest.fn(),
    }

    const mockInstancesService = {
      findOne: jest.fn(),
    }

    const mockImportProducer = {
      startImport: jest.fn(),
    }

    const mockStorage = {
      uploadMedia: jest.fn().mockResolvedValue('tenants/tenant-123/media/2024-03/uuid.jpg'),
      getSignedUrl: jest.fn().mockResolvedValue('http://localhost:9000/bucket/key?signed'),
      delete: jest.fn(),
      download: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: InboxRepository, useValue: mockRepository },
        { provide: InboxGateway, useValue: mockGateway },
        { provide: WhatsAppService, useValue: mockWhatsapp },
        { provide: InstancesService, useValue: mockInstancesService },
        { provide: ConversationImportProducer, useValue: mockImportProducer },
        { provide: StorageService, useValue: mockStorage },
        { provide: DealService, useValue: { findOrCreateForContact: jest.fn() } },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
        { provide: NotificationsService, useValue: { dispatch: jest.fn() } },
        { provide: ContactsService, useValue: { findOrCreate: jest.fn(), findById: jest.fn() } },
        { provide: TenantsService, useValue: { findById: jest.fn() } },
      ],
    }).compile()

    service = module.get(InboxService)
    repository = module.get(InboxRepository)
    gateway = module.get(InboxGateway)
    whatsapp = module.get(WhatsAppService)
    instancesService = module.get(InstancesService)
    importProducer = module.get(ConversationImportProducer)
    storage = module.get(StorageService)
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

    it('should use sendGroupMention when mentions are provided in a group', async () => {
      const groupConversation = {
        ...openConversation,
        contact: { id: 'contact-1', phone: '120363012345@g.us', name: 'Grupo Vendas', avatarUrl: null },
      }
      repository.findConversationById.mockResolvedValue(groupConversation)
      whatsapp.sendGroupMention.mockResolvedValue({ messageId: 'evo-mention-1', status: 'sent' })
      repository.createMessage.mockResolvedValue({
        id: 'msg-mention-1',
        tenantId,
        conversationId: 'conv-1',
        fromMe: true,
        fromBot: false,
        body: 'Ola @todos pessoal',
        type: 'TEXT' as const,
        status: 'SENT' as const,
        evolutionId: 'evo-mention-1',
        mediaUrl: null,
        quotedMessageId: null,
        quotedMessage: null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      const mentions = ['5511999@s.whatsapp.net', '5522888@s.whatsapp.net']
      await service.sendMessage(tenantId, 'conv-1', userId, {
        body: 'Ola @todos pessoal',
        mentions,
      })

      expect(whatsapp.sendGroupMention).toHaveBeenCalledWith(
        'acme-vendas',
        '120363012345@g.us',
        { text: 'Ola pessoal', mentions },
      )
      expect(whatsapp.sendText).not.toHaveBeenCalled()
    })

    it('should use sendText when mentions are provided but not a group', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      whatsapp.sendText.mockResolvedValue({ messageId: 'evo-msg-3', status: 'sent' })
      repository.createMessage.mockResolvedValue({
        id: 'msg-3',
        tenantId,
        conversationId: 'conv-1',
        fromMe: true,
        fromBot: false,
        body: 'Hello @[Joao] ',
        type: 'TEXT' as const,
        status: 'SENT' as const,
        evolutionId: 'evo-msg-3',
        mediaUrl: null,
        quotedMessageId: null,
        quotedMessage: null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      await service.sendMessage(tenantId, 'conv-1', userId, {
        body: 'Hello @[Joao] ',
        mentions: ['5511999@s.whatsapp.net'],
      })

      // Not a group, so sendText should be used instead
      expect(whatsapp.sendText).toHaveBeenCalled()
      expect(whatsapp.sendGroupMention).not.toHaveBeenCalled()
    })
  })

  describe('getGroupMembers', () => {
    it('should return group members for a group conversation', async () => {
      const groupConversation = {
        ...mockConversation,
        contact: { id: 'contact-1', phone: '120363012345@g.us', name: 'Grupo Vendas', avatarUrl: null },
      }
      repository.findConversationById.mockResolvedValue(groupConversation)
      whatsapp.getGroupMembers.mockResolvedValue([
        { id: '5511999@s.whatsapp.net', name: 'Joao', admin: true },
        { id: '5522888@s.whatsapp.net', name: 'Maria', admin: false },
      ])

      const result = await service.getGroupMembers(tenantId, 'conv-1')

      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Joao')
      expect(whatsapp.getGroupMembers).toHaveBeenCalledWith('acme-vendas', '120363012345@g.us')
    })

    it('should throw NOT_A_GROUP if conversation is not a group', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)

      await expect(
        service.getGroupMembers(tenantId, 'conv-1'),
      ).rejects.toMatchObject({ code: 'NOT_A_GROUP' })
    })

    it('should throw CONVERSATION_NOT_FOUND for invalid conversation', async () => {
      repository.findConversationById.mockResolvedValue(null)

      await expect(
        service.getGroupMembers(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' })
    })
  })

  describe('sendMediaMessage', () => {
    const openConversation = {
      ...mockConversation,
      status: 'OPEN' as const,
      assignedToId: userId,
    }

    const mockMediaMessage = {
      id: 'msg-media-1',
      tenantId,
      conversationId: 'conv-1',
      fromMe: true,
      fromBot: false,
      body: null,
      type: 'IMAGE' as const,
      status: 'SENT' as const,
      evolutionId: 'evo-media-1',
      mediaUrl: 'has-media',
      quotedMessageId: null,
      quotedMessage: null,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should send image and emit WebSocket event', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      whatsapp.sendImage.mockResolvedValue({ messageId: 'evo-media-1', status: 'sent' })
      repository.createMessage.mockResolvedValue(mockMediaMessage)
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      const result = await service.sendMediaMessage(tenantId, 'conv-1', userId, 'agent', {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        filename: 'photo.jpg',
      })

      expect(result.type).toBe('IMAGE')
      expect(whatsapp.sendImage).toHaveBeenCalledWith(
        'acme-vendas',
        '5511999999999',
        expect.objectContaining({ mimetype: 'image/jpeg' }),
      )
      expect(gateway.emitNewMessage).toHaveBeenCalled()
    })

    it('should send document for non-media mimetypes', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      whatsapp.sendDocument.mockResolvedValue({ messageId: 'evo-doc-1', status: 'sent' })
      repository.createMessage.mockResolvedValue({
        ...mockMediaMessage,
        type: 'DOCUMENT' as const,
        evolutionId: 'evo-doc-1',
      })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      const result = await service.sendMediaMessage(tenantId, 'conv-1', userId, 'agent', {
        buffer: Buffer.from('fake-pdf'),
        mimetype: 'application/pdf',
        filename: 'contrato.pdf',
      })

      expect(result.type).toBe('DOCUMENT')
      expect(whatsapp.sendDocument).toHaveBeenCalledWith(
        'acme-vendas',
        '5511999999999',
        expect.objectContaining({ fileName: 'contrato.pdf', mimetype: 'application/pdf' }),
      )
    })

    it('should throw CONVERSATION_NOT_OPEN if conversation is not open', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation) // status: PENDING

      await expect(
        service.sendMediaMessage(tenantId, 'conv-1', userId, 'agent', {
          buffer: Buffer.from('data'),
          mimetype: 'image/png',
          filename: 'img.png',
        }),
      ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_OPEN' })
    })

    it('should throw CONVERSATION_ALREADY_ASSIGNED if not assigned to user', async () => {
      repository.findConversationById.mockResolvedValue({
        ...openConversation,
        assignedToId: 'other-user',
      })

      await expect(
        service.sendMediaMessage(tenantId, 'conv-1', userId, 'agent', {
          buffer: Buffer.from('data'),
          mimetype: 'image/png',
          filename: 'img.png',
        }),
      ).rejects.toMatchObject({ code: 'CONVERSATION_ALREADY_ASSIGNED' })
    })

    it('should throw FILE_TOO_LARGE when image exceeds 16MB', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)

      await expect(
        service.sendMediaMessage(tenantId, 'conv-1', userId, 'agent', {
          buffer: Buffer.alloc(17 * 1024 * 1024), // 17MB > 16MB limit
          mimetype: 'image/jpeg',
          filename: 'big.jpg',
        }),
      ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
    })

    it('should throw MEDIA_UPLOAD_FAILED on WhatsApp error', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      whatsapp.sendImage.mockRejectedValue(new Error('Evolution API error'))

      await expect(
        service.sendMediaMessage(tenantId, 'conv-1', userId, 'agent', {
          buffer: Buffer.from('data'),
          mimetype: 'image/jpeg',
          filename: 'img.jpg',
        }),
      ).rejects.toMatchObject({ code: 'MEDIA_UPLOAD_FAILED' })
    })

    it('should allow admin to send media in any open conversation', async () => {
      const otherUserConversation = { ...openConversation, assignedToId: 'other-user' }
      repository.findConversationById.mockResolvedValue(otherUserConversation)
      whatsapp.sendImage.mockResolvedValue({ messageId: 'evo-media-2', status: 'sent' })
      repository.createMessage.mockResolvedValue({ ...mockMediaMessage, evolutionId: 'evo-media-2' })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      await expect(
        service.sendMediaMessage(tenantId, 'conv-1', userId, 'admin', {
          buffer: Buffer.from('data'),
          mimetype: 'image/png',
          filename: 'img.png',
        }),
      ).resolves.toBeDefined()
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

  describe('syncConversationMessages', () => {
    it('should sync new messages from Evolution API', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)
      whatsapp.findMessages.mockResolvedValue([
        {
          key: { id: 'evo-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
          messageTimestamp: Math.floor(Date.now() / 1000),
          message: { conversation: 'Hello from phone' },
        },
        {
          key: { id: 'evo-2', remoteJid: '5511999999999@s.whatsapp.net', fromMe: true },
          messageTimestamp: Math.floor(Date.now() / 1000) + 1,
          message: { conversation: 'Reply from server' },
        },
      ])
      repository.findExistingEvolutionIds.mockResolvedValue(new Set(['evo-1']))
      repository.createManyMessages.mockResolvedValue({ count: 1 })
      repository.updateLastMessageAt.mockResolvedValue({} as never)

      const result = await service.syncConversationMessages(tenantId, 'conv-1')

      expect(result).toEqual({ data: { synced: true, newMessages: 1 } })
      expect(repository.createManyMessages).toHaveBeenCalledWith([
        expect.objectContaining({
          tenantId,
          conversationId: 'conv-1',
          fromMe: true,
          body: 'Reply from server',
          evolutionId: 'evo-2',
        }),
      ])
      expect(gateway.emitNewMessage).toHaveBeenCalledTimes(1)
    })

    it('should return synced with 0 when no new messages', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)
      whatsapp.findMessages.mockResolvedValue([
        {
          key: { id: 'evo-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
          messageTimestamp: Math.floor(Date.now() / 1000),
          message: { conversation: 'Already exists' },
        },
      ])
      repository.findExistingEvolutionIds.mockResolvedValue(new Set(['evo-1']))

      const result = await service.syncConversationMessages(tenantId, 'conv-1')

      expect(result).toEqual({ data: { synced: true, newMessages: 0 } })
      expect(repository.createManyMessages).not.toHaveBeenCalled()
    })

    it('should return synced false when Evolution API fails', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)
      whatsapp.findMessages.mockRejectedValue(new Error('Connection refused'))

      const result = await service.syncConversationMessages(tenantId, 'conv-1')

      expect(result).toEqual({ data: { synced: false, newMessages: 0 } })
    })

    it('should return synced with 0 when Evolution returns empty', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)
      whatsapp.findMessages.mockResolvedValue([])

      const result = await service.syncConversationMessages(tenantId, 'conv-1')

      expect(result).toEqual({ data: { synced: true, newMessages: 0 } })
    })

    it('should throw CONVERSATION_NOT_FOUND for invalid conversation', async () => {
      repository.findConversationById.mockResolvedValue(null)

      await expect(
        service.syncConversationMessages(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' })
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

  describe('findConversations (tab filtering)', () => {
    it('should filter by tab=all (exclude CLOSE)', async () => {
      repository.findConversations.mockResolvedValue({ conversations: [], total: 0 })

      await service.findConversations(tenantId, { tab: 'all', page: 1, limit: 20 })

      expect(repository.findConversations).toHaveBeenCalledWith(tenantId, expect.objectContaining({
        status: undefined,
        statusNot: 'CLOSE',
        assignedToId: undefined,
        unassigned: false,
      }))
    })

    it('should filter by tab=mine (assigned to current user)', async () => {
      repository.findConversations.mockResolvedValue({ conversations: [], total: 0 })

      await service.findConversations(tenantId, { tab: 'mine', page: 1, limit: 20 }, userId)

      expect(repository.findConversations).toHaveBeenCalledWith(tenantId, expect.objectContaining({
        statusNot: 'CLOSE',
        assignedToId: userId,
      }))
    })

    it('should filter by tab=unassigned (PENDING, no assignee)', async () => {
      repository.findConversations.mockResolvedValue({ conversations: [], total: 0 })

      await service.findConversations(tenantId, { tab: 'unassigned', page: 1, limit: 20 })

      expect(repository.findConversations).toHaveBeenCalledWith(tenantId, expect.objectContaining({
        status: 'PENDING',
        unassigned: true,
      }))
    })
  })

  describe('findMessages', () => {
    it('should return paginated messages for a conversation', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation)
      repository.findMessages.mockResolvedValue({
        messages: [{ id: 'msg-1', body: 'Hello' } as never],
        total: 1,
      })

      const result = await service.findMessages(tenantId, 'conv-1', 1, 20)

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.totalPages).toBe(1)
    })

    it('should throw CONVERSATION_NOT_FOUND for invalid conversation', async () => {
      repository.findConversationById.mockResolvedValue(null)

      await expect(service.findMessages(tenantId, 'nonexistent', 1, 20)).rejects.toMatchObject({
        code: 'CONVERSATION_NOT_FOUND',
      })
    })
  })

  describe('startConversationImport', () => {
    it('should start import for connected instance', async () => {
      instancesService.findOne.mockResolvedValue({
        ...mockConversation.instance,
        status: 'CONNECTED',
        tenantId,
        phone: null,
        evolutionId: 'acme-vendas',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never)
      importProducer.startImport.mockResolvedValue(undefined as never)

      const result = await service.startConversationImport(tenantId, 'inst-1', { messageLimit: 10 })

      expect(result.data.message).toBe('Importacao iniciada')
      expect(importProducer.startImport).toHaveBeenCalledWith({
        tenantId,
        instanceId: 'inst-1',
        evolutionId: 'acme-vendas',
        messageLimit: 10,
      })
    })

    it('should throw IMPORT_INSTANCE_NOT_CONNECTED if instance not connected', async () => {
      instancesService.findOne.mockResolvedValue({
        ...mockConversation.instance,
        status: 'DISCONNECTED',
        tenantId,
        phone: null,
        evolutionId: 'acme-vendas',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never)

      await expect(
        service.startConversationImport(tenantId, 'inst-1', { messageLimit: 10 }),
      ).rejects.toMatchObject({ code: 'IMPORT_INSTANCE_NOT_CONNECTED' })
    })

    it('should throw IMPORT_ALREADY_IN_PROGRESS when duplicate job', async () => {
      instancesService.findOne.mockResolvedValue({
        ...mockConversation.instance,
        status: 'CONNECTED',
        tenantId,
        phone: null,
        evolutionId: 'acme-vendas',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never)
      importProducer.startImport.mockRejectedValue(new Error('Job is already waiting'))

      await expect(
        service.startConversationImport(tenantId, 'inst-1', { messageLimit: 10 }),
      ).rejects.toMatchObject({ code: 'IMPORT_ALREADY_IN_PROGRESS' })
    })
  })

  describe('getMedia', () => {
    const mockMessageWithInstance = {
      id: 'msg-1',
      tenantId,
      conversationId: 'conv-1',
      mediaUrl: 'tenants/tenant-123/media/2024-03/photo.jpg',
      evolutionId: 'evo-msg-1',
      conversation: {
        instance: { evolutionId: 'acme-vendas' },
      },
    }

    it('should download from storage when mediaUrl is a storage key', async () => {
      repository.findMessageWithInstance.mockResolvedValue(mockMessageWithInstance as never)
      storage.download.mockResolvedValue({
        buffer: Buffer.from('image-data'),
        contentType: 'image/jpeg',
      })

      const result = await service.getMedia(tenantId, 'msg-1')

      expect(storage.download).toHaveBeenCalledWith('tenants/tenant-123/media/2024-03/photo.jpg')
      expect(result.mimetype).toBe('image/jpeg')
    })

    it('should fallback to Evolution API when mediaUrl is not a storage key', async () => {
      repository.findMessageWithInstance.mockResolvedValue({
        ...mockMessageWithInstance,
        mediaUrl: 'has-media',
      } as never)
      whatsapp.getMediaBase64.mockResolvedValue({
        base64: Buffer.from('sticker-data').toString('base64'),
        mimetype: 'image/webp',
      })

      const result = await service.getMedia(tenantId, 'msg-1')

      expect(whatsapp.getMediaBase64).toHaveBeenCalledWith('acme-vendas', 'evo-msg-1')
      expect(result.mimetype).toBe('image/webp')
    })

    it('should throw MESSAGE_NOT_FOUND when message does not exist', async () => {
      repository.findMessageWithInstance.mockResolvedValue(null)

      await expect(service.getMedia(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'MESSAGE_NOT_FOUND',
      })
    })

    it('should throw MEDIA_NOT_AVAILABLE when no evolutionId and not stored locally', async () => {
      repository.findMessageWithInstance.mockResolvedValue({
        ...mockMessageWithInstance,
        mediaUrl: 'has-media',
        evolutionId: null,
      } as never)

      await expect(service.getMedia(tenantId, 'msg-1')).rejects.toMatchObject({
        code: 'MEDIA_NOT_AVAILABLE',
      })
    })

    it('should throw MEDIA_DOWNLOAD_FAILED when Evolution returns null', async () => {
      repository.findMessageWithInstance.mockResolvedValue({
        ...mockMessageWithInstance,
        mediaUrl: 'has-media',
      } as never)
      whatsapp.getMediaBase64.mockResolvedValue(null)

      await expect(service.getMedia(tenantId, 'msg-1')).rejects.toMatchObject({
        code: 'MEDIA_DOWNLOAD_FAILED',
      })
    })
  })

  describe('sendMessage (quoted message)', () => {
    const openConversation = {
      ...mockConversation,
      status: 'OPEN' as const,
      assignedToId: userId,
    }

    it('should throw INBOX_QUOTED_MESSAGE_NOT_FOUND when quoted message does not exist', async () => {
      repository.findConversationById.mockResolvedValue(openConversation)
      repository.findMessageById.mockResolvedValue(null)

      await expect(
        service.sendMessage(tenantId, 'conv-1', userId, { body: 'Reply', quotedMessageId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'INBOX_QUOTED_MESSAGE_NOT_FOUND' })
    })
  })
})
