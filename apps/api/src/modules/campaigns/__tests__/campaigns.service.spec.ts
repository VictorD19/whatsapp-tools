import { Test, TestingModule } from '@nestjs/testing'
import { CampaignsService } from '../campaigns.service'
import { CampaignsRepository } from '../campaigns.repository'

describe('CampaignsService', () => {
  let service: CampaignsService
  let repository: jest.Mocked<CampaignsRepository>

  const tenantId = 'tenant-123'

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        {
          provide: CampaignsRepository,
          useValue: {
            findAttributedConversations: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(CampaignsService)
    repository = module.get(CampaignsRepository)
  })

  describe('findAll', () => {
    it('should group conversations by adSourceId, counting conversions and summing won deal value', async () => {
      repository.findAttributedConversations.mockResolvedValue([
        {
          id: 'conv-1',
          createdAt: new Date('2026-07-01T10:00:00Z'),
          lastMessageAt: new Date('2026-07-02T10:00:00Z'),
          contact: {
            adSourceId: 'ad-123',
            adTitle: 'Promoção de verão',
            adSourceUrl: 'https://fb.me/ad-123',
            deals: [{ id: 'deal-1', value: '150.50' }],
          },
        },
        {
          id: 'conv-2',
          createdAt: new Date('2026-07-05T10:00:00Z'),
          lastMessageAt: null,
          contact: {
            adSourceId: 'ad-123',
            adTitle: 'Promoção de verão',
            adSourceUrl: 'https://fb.me/ad-123',
            deals: [],
          },
        },
        {
          id: 'conv-3',
          createdAt: new Date('2026-07-03T10:00:00Z'),
          lastMessageAt: new Date('2026-07-03T12:00:00Z'),
          contact: {
            adSourceId: 'ad-456',
            adTitle: 'Lançamento',
            adSourceUrl: null,
            deals: [{ id: 'deal-2', value: '300.00' }],
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any)

      const result = await service.findAll(tenantId)

      expect(result.data).toHaveLength(2)

      // ad-123 has 2 conversations → sorted first
      expect(result.data[0]).toEqual({
        adSourceId: 'ad-123',
        adTitle: 'Promoção de verão',
        adSourceUrl: 'https://fb.me/ad-123',
        conversationCount: 2,
        convertedCount: 1,
        totalValue: 150.5,
        firstConversationAt: new Date('2026-07-01T10:00:00Z'),
        lastConversationAt: new Date('2026-07-05T10:00:00Z'),
      })

      expect(result.data[1]).toEqual({
        adSourceId: 'ad-456',
        adTitle: 'Lançamento',
        adSourceUrl: null,
        conversationCount: 1,
        convertedCount: 1,
        totalValue: 300,
        firstConversationAt: new Date('2026-07-03T10:00:00Z'),
        lastConversationAt: new Date('2026-07-03T12:00:00Z'),
      })

      expect(repository.findAttributedConversations).toHaveBeenCalledWith(tenantId)
    })

    it('should not double count the same won deal value across two conversations of the same contact', async () => {
      repository.findAttributedConversations.mockResolvedValue([
        {
          id: 'conv-1',
          createdAt: new Date('2026-07-01T10:00:00Z'),
          lastMessageAt: new Date('2026-07-01T10:00:00Z'),
          contact: {
            adSourceId: 'ad-123',
            adTitle: 'Promoção',
            adSourceUrl: null,
            deals: [{ id: 'deal-1', value: '100.00' }],
          },
        },
        {
          id: 'conv-2',
          createdAt: new Date('2026-07-02T10:00:00Z'),
          lastMessageAt: new Date('2026-07-02T10:00:00Z'),
          contact: {
            adSourceId: 'ad-123',
            adTitle: 'Promoção',
            adSourceUrl: null,
            deals: [{ id: 'deal-1', value: '100.00' }],
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any)

      const result = await service.findAll(tenantId)

      expect(result.data[0].conversationCount).toBe(2)
      expect(result.data[0].convertedCount).toBe(2)
      expect(result.data[0].totalValue).toBe(100)
    })

    it('should return an empty list when there are no attributed conversations', async () => {
      repository.findAttributedConversations.mockResolvedValue([])

      const result = await service.findAll(tenantId)

      expect(result.data).toEqual([])
    })
  })
})
