import { Test, TestingModule } from '@nestjs/testing'
import { ContactListsService } from '../contact-lists.service'
import { ContactListsRepository } from '../contact-lists.repository'
import { ContactsService } from '../../contacts/contacts.service'

describe('ContactListsService', () => {
  let service: ContactListsService
  let repository: jest.Mocked<ContactListsRepository>
  let contactsService: jest.Mocked<ContactsService>

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
        {
          provide: ContactsService,
          useValue: {
            findOrCreate: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(ContactListsService)
    repository = module.get(ContactListsRepository)
    contactsService = module.get(ContactsService)
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
        undefined,
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

  describe('parseCsv', () => {
    it('should parse CSV with phone and name columns', () => {
      const csv = Buffer.from('phone,name\n5511999999999,João\n5511888888888,Maria')
      const result = service.parseCsv(csv)

      expect(result).toEqual([
        { phone: '5511999999999', name: 'João' },
        { phone: '5511888888888', name: 'Maria' },
      ])
    })

    it('should accept alternative headers (telefone, nome)', () => {
      const csv = Buffer.from('telefone;nome\n5511999999999;João')
      const result = service.parseCsv(csv)

      expect(result).toEqual([{ phone: '5511999999999', name: 'João' }])
    })

    it('should accept semicolon separator', () => {
      const csv = Buffer.from('phone;name\n5511999999999;João\n5511888888888;Maria')
      const result = service.parseCsv(csv)

      expect(result).toHaveLength(2)
    })

    it('should strip non-digit characters from phone', () => {
      const csv = Buffer.from('phone,name\n+55 (11) 99999-9999,João')
      const result = service.parseCsv(csv)

      expect(result[0].phone).toBe('5511999999999')
    })

    it('should skip lines with phone shorter than 8 digits', () => {
      const csv = Buffer.from('phone,name\n123,João\n5511999999999,Maria')
      const result = service.parseCsv(csv)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Maria')
    })

    it('should handle CSV without name column', () => {
      const csv = Buffer.from('phone\n5511999999999\n5511888888888')
      const result = service.parseCsv(csv)

      expect(result).toEqual([
        { phone: '5511999999999', name: undefined },
        { phone: '5511888888888', name: undefined },
      ])
    })

    it('should handle quoted values with commas', () => {
      const csv = Buffer.from('phone,name\n5511999999999,"Silva, João"')
      const result = service.parseCsv(csv)

      expect(result[0].name).toBe('Silva, João')
    })

    it('should throw CSV_EMPTY for empty buffer', () => {
      const csv = Buffer.from('')
      expect(() => service.parseCsv(csv)).toThrow(
        expect.objectContaining({ code: 'CSV_EMPTY' }),
      )
    })

    it('should throw CSV_EMPTY for header-only CSV', () => {
      const csv = Buffer.from('phone,name')
      expect(() => service.parseCsv(csv)).toThrow(
        expect.objectContaining({ code: 'CSV_EMPTY' }),
      )
    })

    it('should throw CSV_PARSE_ERROR when phone header is missing', () => {
      const csv = Buffer.from('email,name\ntest@test.com,João')
      expect(() => service.parseCsv(csv)).toThrow(
        expect.objectContaining({ code: 'CSV_PARSE_ERROR' }),
      )
    })

    it('should handle Windows line endings (CRLF)', () => {
      const csv = Buffer.from('phone,name\r\n5511999999999,João\r\n5511888888888,Maria')
      const result = service.parseCsv(csv)

      expect(result).toHaveLength(2)
    })
  })

  describe('importCsv', () => {
    it('should create contacts and a list from CSV', async () => {
      const csv = Buffer.from('phone,name\n5511999999999,João\n5511888888888,Maria')

      contactsService.findOrCreate
        .mockResolvedValueOnce({ id: 'c1', tenantId, phone: '5511999999999', name: 'João' } as any)
        .mockResolvedValueOnce({ id: 'c2', tenantId, phone: '5511888888888', name: 'Maria' } as any)

      repository.create.mockResolvedValue({
        ...mockList,
        name: 'Minha Lista',
        source: 'CSV_IMPORT' as any,
        contactCount: 2,
      })

      const result = await service.importCsv(tenantId, 'Minha Lista', csv, 'Importado')

      expect(contactsService.findOrCreate).toHaveBeenCalledTimes(2)
      expect(contactsService.findOrCreate).toHaveBeenCalledWith(tenantId, '5511999999999', 'João')
      expect(contactsService.findOrCreate).toHaveBeenCalledWith(tenantId, '5511888888888', 'Maria')
      expect(repository.create).toHaveBeenCalledWith(
        tenantId,
        'Minha Lista',
        'Importado',
        ['c1', 'c2'],
        undefined,
        'CSV_IMPORT',
      )
      expect(result.data.source).toBe('CSV_IMPORT')
    })

    it('should throw CSV_EMPTY when CSV has no valid contacts', async () => {
      const csv = Buffer.from('phone,name\n123,João')

      await expect(
        service.importCsv(tenantId, 'Lista', csv),
      ).rejects.toMatchObject({ code: 'CSV_EMPTY' })
    })

    it('should throw CSV_PARSE_ERROR for invalid CSV format', async () => {
      const csv = Buffer.from('email,name\ntest@test.com,João')

      await expect(
        service.importCsv(tenantId, 'Lista', csv),
      ).rejects.toMatchObject({ code: 'CSV_PARSE_ERROR' })
    })
  })
})
