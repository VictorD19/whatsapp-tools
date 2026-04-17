import { Test, TestingModule } from '@nestjs/testing'
import { ToolExecutorService } from '../definitions/tool-executor.service'
import { ContactsService } from '@modules/contacts/contacts.service'
import { TagService } from '@modules/tag/tag.service'
import { DealService } from '@modules/deal/deal.service'
import { LoggerService } from '@core/logger/logger.service'
import { AiToolType } from '@prisma/client'
import type { ToolContext } from '../definitions/tool-executor.service'
import { CALENDAR_PROVIDER } from '@modules/integrations/integrations.tokens'
import type { ICalendarProvider } from '@modules/integrations/ports/calendar-provider.interface'
import { IntegrationsService } from '@modules/integrations/integrations.service'

describe('ToolExecutorService', () => {
  let executor: ToolExecutorService
  let contactsService: jest.Mocked<ContactsService>
  let tagService: jest.Mocked<TagService>
  let dealService: jest.Mocked<DealService>
  let calendarProvider: jest.Mocked<ICalendarProvider>
  let integrationsService: jest.Mocked<IntegrationsService>

  const now = new Date()

  const context: ToolContext = {
    tenantId: 'tenant-123',
    conversationId: 'conv-1',
    contactId: 'contact-1',
    contactPhone: '5511999999999',
    contactName: 'Joao Silva',
  }

  const baseTool = {
    id: 'tool-1',
    tenantId: 'tenant-123',
    name: 'Test Tool',
    description: null,
    config: {},
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolExecutorService,
        {
          provide: ContactsService,
          useValue: {
            findById: jest.fn(),
            findOrCreate: jest.fn(),
          },
        },
        {
          provide: TagService,
          useValue: {
            addContactTag: jest.fn(),
          },
        },
        {
          provide: DealService,
          useValue: {
            createDeal: jest.fn(),
            findActiveDealByContact: jest.fn(),
            moveDeal: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: CALENDAR_PROVIDER,
          useValue: {
            createEvent: jest.fn(),
            getFreeSlots: jest.fn(),
          },
        },
        {
          provide: IntegrationsService,
          useValue: {
            getDecryptedAccessToken: jest.fn(),
          },
        },
      ],
    }).compile()

    executor = module.get(ToolExecutorService)
    contactsService = module.get(ContactsService)
    tagService = module.get(TagService)
    dealService = module.get(DealService)
    calendarProvider = module.get(CALENDAR_PROVIDER) as unknown as jest.Mocked<ICalendarProvider>
    integrationsService = module.get(IntegrationsService) as unknown as jest.Mocked<IntegrationsService>
  })

  describe('BUSCAR_CONTATO', () => {
    it('should return contact data', async () => {
      const mockContact = {
        id: 'contact-1',
        name: 'Joao Silva',
        phone: '5511999999999',
      }
      contactsService.findById.mockResolvedValue(mockContact as any)

      const result = await executor.execute(
        { ...baseTool, type: AiToolType.BUSCAR_CONTATO },
        context,
      )

      expect(result.success).toBe(true)
      expect(result.output).toContain('Joao Silva')
      expect(result.data).toEqual({
        id: 'contact-1',
        name: 'Joao Silva',
        phone: '5511999999999',
      })
      expect(contactsService.findById).toHaveBeenCalledWith('tenant-123', 'contact-1')
    })
  })

  describe('CRIAR_CONTATO', () => {
    it('should create or find contact', async () => {
      const mockContact = {
        id: 'contact-1',
        name: 'Joao Silva',
        phone: '5511999999999',
      }
      contactsService.findOrCreate.mockResolvedValue(mockContact as any)

      const result = await executor.execute(
        { ...baseTool, type: AiToolType.CRIAR_CONTATO },
        context,
      )

      expect(result.success).toBe(true)
      expect(contactsService.findOrCreate).toHaveBeenCalledWith(
        'tenant-123',
        '5511999999999',
        'Joao Silva',
      )
    })
  })

  describe('TRANSFERIR_HUMANO', () => {
    it('should return handoff: true with message', () => {
      const tool = {
        ...baseTool,
        type: AiToolType.TRANSFERIR_HUMANO,
        config: { message: 'Transferindo para atendente humano' },
      }

      const result = executor.execute(tool, context)

      return result.then((r) => {
        expect(r.success).toBe(true)
        expect(r.output).toBe('Transferindo para atendente humano')
        expect(r.data).toEqual({ handoff: true })
      })
    })
  })

  describe('ADICIONAR_TAG', () => {
    it('should add tags to contact', async () => {
      tagService.addContactTag.mockResolvedValue({ data: [] } as any)

      const tool = {
        ...baseTool,
        type: AiToolType.ADICIONAR_TAG,
        config: { tagIds: ['tag-1', 'tag-2'] },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('2 tag(s)')
      expect(tagService.addContactTag).toHaveBeenCalledTimes(2)
    })
  })

  describe('CRIAR_DEAL', () => {
    it('should create deal with contact name', async () => {
      dealService.createDeal.mockResolvedValue({ id: 'deal-1' } as any)

      const tool = {
        ...baseTool,
        type: AiToolType.CRIAR_DEAL,
        config: { pipelineId: 'pipe-1', stageId: 'stage-1' },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Lead - Joao Silva')
      expect(dealService.createDeal).toHaveBeenCalledWith('tenant-123', {
        contactId: 'contact-1',
        conversationId: 'conv-1',
        pipelineId: 'pipe-1',
        stageId: 'stage-1',
        title: 'Lead - Joao Silva',
      })
    })
  })

  describe('SETAR_ETAPA_PIPELINE', () => {
    it('should move active deal to configured stage', async () => {
      dealService.findActiveDealByContact.mockResolvedValue({ id: 'deal-1' } as any)
      dealService.moveDeal.mockResolvedValue({ id: 'deal-1' } as any)

      const tool = {
        ...baseTool,
        type: AiToolType.SETAR_ETAPA_PIPELINE,
        config: { pipelineId: 'pipe-1', stageId: 'stage-2' },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('deal-1')
      expect(dealService.moveDeal).toHaveBeenCalledWith('tenant-123', 'deal-1', { stageId: 'stage-2' })
    })

    it('should return success false when contact has no active deal', async () => {
      dealService.findActiveDealByContact.mockResolvedValue(null)

      const tool = {
        ...baseTool,
        type: AiToolType.SETAR_ETAPA_PIPELINE,
        config: { pipelineId: 'pipe-1', stageId: 'stage-2' },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('nenhum deal ativo')
      expect(dealService.moveDeal).not.toHaveBeenCalled()
    })

    it('should return success false when moveDeal throws', async () => {
      dealService.findActiveDealByContact.mockResolvedValue({ id: 'deal-1' } as any)
      dealService.moveDeal.mockRejectedValue(new Error('Deal ja esta encerrado'))

      const tool = {
        ...baseTool,
        type: AiToolType.SETAR_ETAPA_PIPELINE,
        config: { pipelineId: 'pipe-1', stageId: 'stage-won' },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('Não foi possível mover')
    })
  })

  describe('WEBHOOK_EXTERNO', () => {
    it('should call fetch with URL from config', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"ok":true}'),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const tool = {
        ...baseTool,
        type: AiToolType.WEBHOOK_EXTERNO,
        config: {
          url: 'https://example.com/webhook',
          method: 'POST',
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('sucesso')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      )
    })

    it('should return error when webhook fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const tool = {
        ...baseTool,
        type: AiToolType.WEBHOOK_EXTERNO,
        config: { url: 'https://example.com/webhook' },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('erro')
    })
  })

  describe('CONSULTAR_DISPONIBILIDADE', () => {
    it('should return formatted free slots', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockResolvedValue('access-token')
      calendarProvider.getFreeSlots = jest.fn().mockResolvedValue([
        { startAt: new Date('2026-04-17T09:00:00'), endAt: new Date('2026-04-17T10:00:00') },
        { startAt: new Date('2026-04-17T10:00:00'), endAt: new Date('2026-04-17T11:00:00') },
      ])

      const tool = {
        ...baseTool,
        type: AiToolType.CONSULTAR_DISPONIBILIDADE,
        config: {
          integrationId: 'int-1',
          lookAheadDays: 7,
          slotDurationMinutes: 60,
          workingHours: { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Horários disponíveis')
      expect(integrationsService.getDecryptedAccessToken).toHaveBeenCalledWith('tenant-123', 'int-1')
    })

    it('should return message when no slots available', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockResolvedValue('access-token')
      calendarProvider.getFreeSlots = jest.fn().mockResolvedValue([])

      const tool = {
        ...baseTool,
        type: AiToolType.CONSULTAR_DISPONIBILIDADE,
        config: {
          integrationId: 'int-1',
          lookAheadDays: 7,
          slotDurationMinutes: 60,
          workingHours: { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Nenhum horário disponível')
    })

    it('should return error when integration not found', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockRejectedValue(
        new Error('Integration not found'),
      )

      const tool = {
        ...baseTool,
        type: AiToolType.CONSULTAR_DISPONIBILIDADE,
        config: {
          integrationId: 'nonexistent',
          lookAheadDays: 7,
          slotDurationMinutes: 60,
          workingHours: { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('Erro ao consultar')
    })
  })

  describe('CRIAR_EVENTO', () => {
    it('should create event and return link', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockResolvedValue('access-token')
      calendarProvider.createEvent = jest.fn().mockResolvedValue({
        eventId: 'evt-1',
        htmlLink: 'https://calendar.google.com/event?eid=xxx',
        hangoutLink: 'https://meet.google.com/abc',
        status: 'confirmed',
      })

      const tool = {
        ...baseTool,
        type: AiToolType.CRIAR_EVENTO,
        config: {
          integrationId: 'int-1',
          defaultDurationMinutes: 60,
          timezone: 'America/Sao_Paulo',
          createMeetLink: true,
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Evento criado')
      expect(result.data).toHaveProperty('eventId', 'evt-1')
    })

    it('should return error when integration is disconnected', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockRejectedValue(
        new Error('Integration disconnected'),
      )

      const tool = {
        ...baseTool,
        type: AiToolType.CRIAR_EVENTO,
        config: {
          integrationId: 'int-1',
          defaultDurationMinutes: 60,
          timezone: 'America/Sao_Paulo',
          createMeetLink: true,
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('Erro ao criar evento')
    })
  })
})
