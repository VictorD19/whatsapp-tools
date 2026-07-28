import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getQueueToken } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { InboxWebhookProcessor } from '../inbox-webhook.processor'
import { InboxRepository } from '../../inbox.repository'
import { InboxGateway } from '../../inbox.gateway'
import { ContactsService } from '@modules/contacts/contacts.service'
import { InstancesService } from '@modules/instances/instances.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { TenantsService } from '@modules/tenants/tenants.service'
import { StorageService } from '@modules/storage/storage.service'
import { DealService } from '@modules/deal/deal.service'
import { LoggerService } from '@core/logger/logger.service'
import { SPEECH_TO_TEXT } from '@modules/ai/ai.tokens'

describe('InboxWebhookProcessor', () => {
  let processor: InboxWebhookProcessor
  let repository: jest.Mocked<InboxRepository>
  let contactsService: jest.Mocked<ContactsService>
  let instancesService: jest.Mocked<InstancesService>
  let whatsapp: jest.Mocked<WhatsAppService>
  let tenantsService: jest.Mocked<TenantsService>
  let storage: jest.Mocked<StorageService>
  let aiResponseQueue: { getJob: jest.Mock; add: jest.Mock }

  const tenantId = 'tenant-1'
  const instance = {
    id: 'inst-1',
    tenantId,
    evolutionId: 'acme-vendas',
    defaultAssistantId: null,
  }

  const mockContact = { id: 'contact-1', avatarUrl: 'https://example.com/avatar.jpg' }
  const mockConversation = {
    id: 'conv-1',
    assistantPausedAt: null as Date | null,
  }

  function buildJob(data: Record<string, unknown>): Job<any> {
    return { data } as Job<any>
  }

  beforeEach(async () => {
    const mockRepository = {
      findMessageByEvolutionId: jest.fn().mockResolvedValue(null),
      findActiveConversation: jest.fn().mockResolvedValue(mockConversation),
      findConversationByContactAndInstance: jest.fn().mockResolvedValue(null),
      reopenConversation: jest.fn(),
      createConversation: jest.fn().mockResolvedValue(mockConversation),
      incrementUnreadCount: jest.fn(),
      createMessage: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'msg-1', ...data })),
      resetInactivityTracking: jest.fn(),
      updateMessageMediaUrl: jest.fn(),
      findConversationById: jest.fn().mockResolvedValue(mockConversation),
      findReactionsByMessageId: jest.fn(),
      deleteReaction: jest.fn(),
      upsertReaction: jest.fn(),
      updateMessageStatusByEvolutionId: jest.fn(),
    }

    const mockContactsService = {
      findOrCreate: jest.fn().mockResolvedValue(mockContact),
      setAdAttributionIfMissing: jest.fn(),
      updateAvatarUrl: jest.fn(),
    }

    const mockInstancesService = {
      findByEvolutionId: jest.fn().mockResolvedValue(instance),
    }

    const mockWhatsapp = {
      getMediaBase64: jest.fn(),
      getProfilePictureUrl: jest.fn().mockResolvedValue(null),
    }

    const mockTenantsService = {
      getNextProtocol: jest.fn().mockResolvedValue('SCHA1000'),
    }

    const mockStorage = {
      uploadMedia: jest.fn().mockResolvedValue('tenants/tenant-1/media/2026-07/uuid.bin'),
    }

    const mockDealService = {
      findOrCreateForContact: jest.fn().mockResolvedValue(null),
    }

    const mockGateway = {
      emitConversationCreated: jest.fn(),
      emitNewMessage: jest.fn(),
      emitConversationDealUpdated: jest.fn(),
      emitMessageReactionUpdated: jest.fn(),
      emitMessageStatusUpdated: jest.fn(),
    }

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }

    const mockConfig = {
      get: jest.fn().mockReturnValue(undefined), // usa o default de 25MB
    }

    const mockAiResponseQueue = {
      getJob: jest.fn().mockResolvedValue(null),
      add: jest.fn(),
    }

    const mockStt = { transcribe: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxWebhookProcessor,
        { provide: InboxRepository, useValue: mockRepository },
        { provide: ContactsService, useValue: mockContactsService },
        { provide: InstancesService, useValue: mockInstancesService },
        { provide: WhatsAppService, useValue: mockWhatsapp },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: StorageService, useValue: mockStorage },
        { provide: DealService, useValue: mockDealService },
        { provide: InboxGateway, useValue: mockGateway },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getQueueToken(QUEUES.AI_RESPONSE), useValue: mockAiResponseQueue },
        { provide: SPEECH_TO_TEXT, useValue: mockStt },
      ],
    }).compile()

    processor = module.get(InboxWebhookProcessor)
    repository = module.get(InboxRepository)
    contactsService = module.get(ContactsService)
    instancesService = module.get(InstancesService)
    whatsapp = module.get(WhatsAppService)
    tenantsService = module.get(TenantsService)
    storage = module.get(StorageService)
    aiResponseQueue = module.get(getQueueToken(QUEUES.AI_RESPONSE))

    // silencia uso de variáveis não lidas diretamente nos testes (mantidas para tipagem/mocks)
    void contactsService
    void instancesService
    void tenantsService
    void aiResponseQueue
  })

  function documentJobData(fileLength: number) {
    return {
      instanceName: instance.evolutionId,
      event: 'messages.upsert',
      receivedAt: new Date().toISOString(),
      data: {
        key: { id: 'evo-msg-1', remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
        pushName: 'Cliente',
        messageTimestamp: Math.floor(Date.now() / 1000),
        message: {
          documentMessage: {
            fileName: 'contrato.pdf',
            url: 'https://mmg.whatsapp.net/doc.enc',
            mimetype: 'application/pdf',
            fileLength,
          },
        },
      },
    }
  }

  describe('handleInboxWebhook — mídia acima do limite', () => {
    it('não baixa o documento e marca no corpo quando fileLength excede o limite (25MB default)', async () => {
      const oversizedBytes = 265 * 1024 * 1024 // 265MB — mesmo cenário do incidente em produção
      const job = buildJob(documentJobData(oversizedBytes))

      await processor.handleInboxWebhook(job)

      expect(whatsapp.getMediaBase64).not.toHaveBeenCalled()
      expect(storage.uploadMedia).not.toHaveBeenCalled()
      expect(repository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DOCUMENT',
          body: expect.stringContaining('contrato.pdf'),
        }),
      )
      const createdBody = repository.createMessage.mock.calls[0][0].body as string
      expect(createdBody).toMatch(/mídia não baixada/i)
      expect(createdBody).toMatch(/265\.0MB/)
    })

    it('continua processando a mensagem normalmente mesmo pulando o download', async () => {
      const oversizedBytes = 265 * 1024 * 1024
      const job = buildJob(documentJobData(oversizedBytes))

      await processor.handleInboxWebhook(job)

      expect(repository.createMessage).toHaveBeenCalledTimes(1)
      expect(repository.resetInactivityTracking).toHaveBeenCalledWith(mockConversation.id)
    })

    it('baixa normalmente quando fileLength está dentro do limite', async () => {
      whatsapp.getMediaBase64.mockResolvedValue({
        base64: Buffer.from('conteudo').toString('base64'),
        mimetype: 'application/pdf',
      })

      const smallBytes = 1 * 1024 * 1024 // 1MB
      const job = buildJob(documentJobData(smallBytes))

      await processor.handleInboxWebhook(job)

      expect(whatsapp.getMediaBase64).toHaveBeenCalledWith(instance.evolutionId, 'evo-msg-1')
      expect(storage.uploadMedia).toHaveBeenCalled()
      const createdBody = repository.createMessage.mock.calls[0][0].body as string
      expect(createdBody).not.toMatch(/mídia não baixada/i)
    })

    it('baixa normalmente quando o payload não informa fileLength', async () => {
      whatsapp.getMediaBase64.mockResolvedValue({
        base64: Buffer.from('conteudo').toString('base64'),
        mimetype: 'application/pdf',
      })

      const job = buildJob(documentJobData(undefined as unknown as number))
      delete (job.data.data as any).message.documentMessage.fileLength

      await processor.handleInboxWebhook(job)

      expect(whatsapp.getMediaBase64).toHaveBeenCalled()
    })
  })
})
