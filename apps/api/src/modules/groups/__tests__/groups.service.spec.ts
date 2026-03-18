import { Test, TestingModule } from '@nestjs/testing'
import { GroupsService } from '../groups.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstancesService } from '@modules/instances/instances.service'
import { GroupExtractProducer } from '../queues/extract.producer'
import { LoggerService } from '@core/logger/logger.service'

describe('GroupsService', () => {
  let service: GroupsService
  let whatsapp: jest.Mocked<WhatsAppService>
  let instancesService: jest.Mocked<InstancesService>
  let extractProducer: jest.Mocked<GroupExtractProducer>

  const tenantId = 'tenant-123'

  const mockInstance = {
    id: 'inst-1',
    tenantId,
    name: 'Vendas',
    phone: '5511999999999',
    status: 'CONNECTED' as const,
    evolutionId: 'tenant-123_Vendas',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as Date | null,
    defaultAssistantId: null as string | null,
  }

  const mockGroups = [
    { id: '120363@g.us', name: 'Clientes VIP', size: 50 },
    { id: '120364@g.us', name: 'Promoções', size: 120 },
  ]

  const mockMembers = [
    { id: '5511999999999@s.whatsapp.net', phone: '5511999999999', name: 'João', admin: false },
    { id: '5511888888888@s.whatsapp.net', phone: '5511888888888', name: 'Maria', admin: true },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: WhatsAppService,
          useValue: {
            getGroups: jest.fn(),
            getGroupMembers: jest.fn(),
          },
        },
        {
          provide: InstancesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: GroupExtractProducer,
          useValue: {
            startExtraction: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(GroupsService)
    whatsapp = module.get(WhatsAppService)
    instancesService = module.get(InstancesService)
    extractProducer = module.get(GroupExtractProducer)
  })

  describe('getGroups', () => {
    it('should return groups for a connected instance', async () => {
      instancesService.findOne.mockResolvedValue(mockInstance)
      whatsapp.getGroups.mockResolvedValue(mockGroups)

      const result = await service.getGroups(tenantId, 'inst-1')

      expect(result.data).toEqual(mockGroups)
      expect(whatsapp.getGroups).toHaveBeenCalledWith('tenant-123_Vendas')
    })

    it('should throw if instance not connected', async () => {
      instancesService.findOne.mockResolvedValue({
        ...mockInstance,
        status: 'DISCONNECTED',
      })

      await expect(service.getGroups(tenantId, 'inst-1')).rejects.toMatchObject({
        code: 'GROUP_EXTRACT_INSTANCE_NOT_CONNECTED',
      })
    })
  })

  describe('getGroupMembers', () => {
    it('should return members for a group', async () => {
      instancesService.findOne.mockResolvedValue(mockInstance)
      whatsapp.getGroupMembers.mockResolvedValue(mockMembers)

      const result = await service.getGroupMembers(tenantId, 'inst-1', '120363@g.us')

      expect(result.data).toEqual(mockMembers)
      expect(whatsapp.getGroupMembers).toHaveBeenCalledWith('tenant-123_Vendas', '120363@g.us')
    })

    it('should throw if instance not connected', async () => {
      instancesService.findOne.mockResolvedValue({
        ...mockInstance,
        status: 'DISCONNECTED',
      })

      await expect(
        service.getGroupMembers(tenantId, 'inst-1', '120363@g.us'),
      ).rejects.toMatchObject({
        code: 'GROUP_EXTRACT_INSTANCE_NOT_CONNECTED',
      })
    })

    it('should throw GROUP_MEMBERS_FETCH_FAILED on whatsapp error', async () => {
      instancesService.findOne.mockResolvedValue(mockInstance)
      whatsapp.getGroupMembers.mockRejectedValue(new Error('API timeout'))

      await expect(
        service.getGroupMembers(tenantId, 'inst-1', '120363@g.us'),
      ).rejects.toMatchObject({
        code: 'GROUP_MEMBERS_FETCH_FAILED',
      })
    })
  })

  describe('extractContacts', () => {
    it('should queue extraction job', async () => {
      instancesService.findOne.mockResolvedValue(mockInstance)
      extractProducer.startExtraction.mockResolvedValue({ id: 'job-123' } as any)

      const result = await service.extractContacts(tenantId, {
        instanceId: 'inst-1',
        groupIds: ['120363@g.us', '120364@g.us'],
      })

      expect(result.data.jobId).toBe('job-123')
      expect(extractProducer.startExtraction).toHaveBeenCalledWith({
        tenantId,
        instanceId: 'inst-1',
        evolutionId: 'tenant-123_Vendas',
        groupIds: ['120363@g.us', '120364@g.us'],
        createList: undefined,
      })
    })

    it('should pass createList options when provided', async () => {
      instancesService.findOne.mockResolvedValue(mockInstance)
      extractProducer.startExtraction.mockResolvedValue({ id: 'job-456' } as any)

      await service.extractContacts(tenantId, {
        instanceId: 'inst-1',
        groupIds: ['120363@g.us'],
        createList: { name: 'Minha Lista', description: 'Descrição' },
      })

      expect(extractProducer.startExtraction).toHaveBeenCalledWith(
        expect.objectContaining({
          createList: { name: 'Minha Lista', description: 'Descrição' },
        }),
      )
    })

    it('should throw if instance not connected', async () => {
      instancesService.findOne.mockResolvedValue({
        ...mockInstance,
        status: 'DISCONNECTED',
      })

      await expect(
        service.extractContacts(tenantId, {
          instanceId: 'inst-1',
          groupIds: ['120363@g.us'],
        }),
      ).rejects.toMatchObject({
        code: 'GROUP_EXTRACT_INSTANCE_NOT_CONNECTED',
      })
    })
  })
})
