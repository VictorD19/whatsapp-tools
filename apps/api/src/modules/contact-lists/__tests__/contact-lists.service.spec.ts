import { Test, TestingModule } from '@nestjs/testing'
import { ContactListsService } from '../contact-lists.service'
import { ContactListsRepository } from '../contact-lists.repository'

describe('ContactListsService', () => {
  let service: ContactListsService
  let repository: jest.Mocked<ContactListsRepository>

  const tenantId = 'tenant-123'

  const mockList = {
    id: 'list-1',
    tenantId,
    name: 'Contatos VIP',
    description: 'Extraídos do grupo VIP',
    source: 'GROUP_EXTRACT' as const,
    contactCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as Date | null,
  }

  const mockListWithContacts = {
    ...mockList,
    items: [
      {
        contactListId: 'list-1',
        contactId: 'contact-1',
        addedAt: new Date(),
        contact: { id: 'contact-1', phone: '5511999999999', name: 'João', avatarUrl: null },
      },
    ],
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactListsService,
        {
          provide: ContactListsRepository,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findByIdWithContacts: jest.fn(),
            create: jest.fn(),
            softDelete: jest.fn(),
            getContactsForExport: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(ContactListsService)
    repository = module.get(ContactListsRepository)
  })

  describe('findMany', () => {
    it('should return paginated contact lists', async () => {
      repository.findMany.mockResolvedValue({ lists: [mockList], total: 1 })

      const result = await service.findMany(tenantId, { page: 1, limit: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      })
    })

    it('should calculate totalPages correctly', async () => {
      repository.findMany.mockResolvedValue({ lists: [mockList], total: 45 })

      const result = await service.findMany(tenantId, { page: 1, limit: 20 })

      expect(result.meta.totalPages).toBe(3)
    })
  })

  describe('findById', () => {
    it('should return a contact list with contacts', async () => {
      repository.findByIdWithContacts.mockResolvedValue(mockListWithContacts)

      const result = await service.findById(tenantId, 'list-1')

      expect(result.data.name).toBe('Contatos VIP')
      expect(result.data.items).toHaveLength(1)
    })

    it('should throw CONTACT_LIST_NOT_FOUND if not found', async () => {
      repository.findByIdWithContacts.mockResolvedValue(null)

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'CONTACT_LIST_NOT_FOUND',
      })
    })
  })

  describe('create', () => {
    it('should create a contact list', async () => {
      repository.create.mockResolvedValue(mockList)

      const result = await service.create(tenantId, {
        name: 'Contatos VIP',
        contactIds: ['contact-1', 'contact-2'],
      })

      expect(result.data).toEqual(mockList)
      expect(repository.create).toHaveBeenCalledWith(
        tenantId,
        'Contatos VIP',
        undefined,
        ['contact-1', 'contact-2'],
      )
    })
  })

  describe('remove', () => {
    it('should soft delete a contact list', async () => {
      repository.findById.mockResolvedValue(mockList)
      repository.softDelete.mockResolvedValue({ ...mockList, deletedAt: new Date() })

      const result = await service.remove(tenantId, 'list-1')

      expect(result.data).toEqual({ deleted: true })
    })

    it('should throw CONTACT_LIST_NOT_FOUND if not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'CONTACT_LIST_NOT_FOUND',
      })
    })
  })

  describe('exportContacts', () => {
    it('should generate CSV', async () => {
      repository.getContactsForExport.mockResolvedValue([
        { phone: '5511999999999', name: 'João' },
        { phone: '5511888888888', name: null },
      ])

      const result = await service.exportContacts(tenantId, { format: 'csv' })

      expect(result.contentType).toBe('text/csv')
      expect(result.content).toContain('phone,name')
      expect(result.content).toContain('5511999999999')
      expect(result.filename).toMatch(/contacts-\d+\.csv/)
    })

    it('should generate Excel (TSV)', async () => {
      repository.getContactsForExport.mockResolvedValue([
        { phone: '5511999999999', name: 'João' },
      ])

      const result = await service.exportContacts(tenantId, { format: 'excel' })

      expect(result.contentType).toBe('application/vnd.ms-excel')
      expect(result.content).toContain('phone\tname')
    })

    it('should throw CONTACT_LIST_EMPTY if no contacts', async () => {
      repository.getContactsForExport.mockResolvedValue([])

      await expect(
        service.exportContacts(tenantId, { format: 'csv' }),
      ).rejects.toMatchObject({
        code: 'CONTACT_LIST_EMPTY',
      })
    })
  })
})
