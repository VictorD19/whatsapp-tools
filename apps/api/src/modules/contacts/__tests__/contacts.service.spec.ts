import { Test, TestingModule } from '@nestjs/testing'
import { ContactsService } from '../contacts.service'
import { ContactsRepository } from '../contacts.repository'
import { AppException } from '@core/errors/app.exception'

describe('ContactsService', () => {
  let service: ContactsService
  let repository: jest.Mocked<ContactsRepository>

  const tenantId = 'tenant-123'

  const mockContact = {
    id: 'contact-1',
    tenantId,
    phone: '5511999999999',
    name: 'João Silva',
    avatarUrl: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as Date | null,
  }

  const mockContactWithTags = {
    ...mockContact,
    contactTags: [] as { createdAt: Date; contactId: string; tagId: string; tag: { id: string; tenantId: string; name: string; color: string; createdAt: Date; updatedAt: Date } }[],
  }

  beforeEach(async () => {
    const mockRepository = {
      findByPhone: jest.fn(),
      findOrCreate: jest.fn(),
      updateAvatarUrl: jest.fn(),
      findById: jest.fn(),
      findAllByTenant: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: ContactsRepository, useValue: mockRepository },
      ],
    }).compile()

    service = module.get(ContactsService)
    repository = module.get(ContactsRepository)
  })

  describe('findMany', () => {
    it('should return paginated contacts', async () => {
      repository.findMany.mockResolvedValue({
        contacts: [mockContactWithTags],
        total: 1,
      })

      const result = await service.findMany(tenantId, {
        page: 1,
        limit: 20,
        includeDeleted: false,
      })

      expect(result.data).toHaveLength(1)
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      })
      expect(repository.findMany).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        includeDeleted: false,
      })
    })

    it('should pass search filter to repository', async () => {
      repository.findMany.mockResolvedValue({
        contacts: [],
        total: 0,
      })

      await service.findMany(tenantId, {
        search: 'João',
        page: 1,
        limit: 20,
        includeDeleted: false,
      })

      expect(repository.findMany).toHaveBeenCalledWith(tenantId, {
        search: 'João',
        page: 1,
        limit: 20,
        includeDeleted: false,
      })
    })

    it('should calculate totalPages correctly', async () => {
      repository.findMany.mockResolvedValue({
        contacts: [mockContactWithTags],
        total: 45,
      })

      const result = await service.findMany(tenantId, {
        page: 1,
        limit: 20,
        includeDeleted: false,
      })

      expect(result.meta.totalPages).toBe(3)
    })
  })

  describe('findById', () => {
    it('should return a contact', async () => {
      repository.findById.mockResolvedValue(mockContact)

      const result = await service.findById(tenantId, 'contact-1')

      expect(result).toEqual(mockContact)
    })

    it('should throw CONTACT_NOT_FOUND if not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'CONTACT_NOT_FOUND',
      })
    })
  })

  describe('create', () => {
    it('should create a contact', async () => {
      repository.findByPhone.mockResolvedValue(null)
      repository.create.mockResolvedValue(mockContact)

      const result = await service.create(tenantId, {
        phone: '5511999999999',
        name: 'João Silva',
      })

      expect(result.data).toEqual(mockContact)
      expect(repository.create).toHaveBeenCalledWith(tenantId, {
        phone: '5511999999999',
        name: 'João Silva',
      })
    })

    it('should throw CONTACT_DUPLICATE if phone already exists', async () => {
      repository.findByPhone.mockResolvedValue(mockContact)

      await expect(
        service.create(tenantId, { phone: '5511999999999' }),
      ).rejects.toMatchObject({ code: 'CONTACT_DUPLICATE' })
    })
  })

  describe('update', () => {
    it('should update a contact', async () => {
      const updated = { ...mockContact, name: 'João Atualizado' }
      repository.findById.mockResolvedValue(mockContact)
      repository.update.mockResolvedValue(updated)

      const result = await service.update(tenantId, 'contact-1', {
        name: 'João Atualizado',
      })

      expect(result.data.name).toBe('João Atualizado')
    })

    it('should throw CONTACT_NOT_FOUND if not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'Test' }),
      ).rejects.toMatchObject({ code: 'CONTACT_NOT_FOUND' })
    })

    it('should throw CONTACT_DUPLICATE if new phone already exists', async () => {
      const otherContact = { ...mockContact, id: 'contact-2', phone: '5511888888888' }
      repository.findById.mockResolvedValue(mockContact)
      repository.findByPhone.mockResolvedValue(otherContact)

      await expect(
        service.update(tenantId, 'contact-1', { phone: '5511888888888' }),
      ).rejects.toMatchObject({ code: 'CONTACT_DUPLICATE' })
    })

    it('should not check duplicate if phone unchanged', async () => {
      repository.findById.mockResolvedValue(mockContact)
      repository.update.mockResolvedValue(mockContact)

      await service.update(tenantId, 'contact-1', { phone: mockContact.phone })

      expect(repository.findByPhone).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('should soft delete a contact', async () => {
      repository.findById.mockResolvedValue(mockContact)
      repository.softDelete.mockResolvedValue({
        ...mockContact,
        deletedAt: new Date(),
      })

      const result = await service.remove(tenantId, 'contact-1')

      expect(result.data).toEqual({ deleted: true })
      expect(repository.softDelete).toHaveBeenCalledWith('contact-1')
    })

    it('should throw CONTACT_NOT_FOUND if not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.remove(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'CONTACT_NOT_FOUND' })
    })
  })
})
