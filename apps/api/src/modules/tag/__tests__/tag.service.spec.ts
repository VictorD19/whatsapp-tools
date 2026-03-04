import { Test, TestingModule } from '@nestjs/testing'
import { TagService } from '../tag.service'
import { TagRepository } from '../tag.repository'

describe('TagService', () => {
  let service: TagService
  let repository: jest.Mocked<TagRepository>

  const tenantId = 'tenant-123'

  const now = new Date()

  const mockTag = {
    id: 'tag-1',
    tenantId,
    name: 'VIP',
    color: '#22C55E',
    createdAt: now,
    updatedAt: now,
  }

  const mockContactTag = (tagId: string, tag: typeof mockTag) => ({
    contactId: 'contact-1',
    tagId,
    createdAt: now,
    tag,
  })

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
      findContactTags: jest.fn(),
      addContactTag: jest.fn(),
      removeContactTag: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: TagRepository, useValue: mockRepository },
      ],
    }).compile()

    service = module.get(TagService)
    repository = module.get(TagRepository)
  })

  describe('findAll', () => {
    it('should return tags ordered by name', async () => {
      const tags = [
        { ...mockTag, id: 'tag-2', name: 'Indicacao' },
        mockTag,
      ]
      repository.findAll.mockResolvedValue(tags)

      const result = await service.findAll(tenantId)

      expect(result.data).toHaveLength(2)
      expect(result.data).toEqual(tags)
      expect(repository.findAll).toHaveBeenCalledWith(tenantId)
    })
  })

  describe('create', () => {
    it('should create a tag successfully', async () => {
      repository.findByName.mockResolvedValue(null)
      repository.create.mockResolvedValue(mockTag)

      const result = await service.create(tenantId, { name: 'VIP', color: '#22C55E' })

      expect(result.data).toEqual(mockTag)
      expect(repository.findByName).toHaveBeenCalledWith(tenantId, 'VIP')
      expect(repository.create).toHaveBeenCalledWith(tenantId, 'VIP', '#22C55E')
    })

    it('should throw TAG_NAME_ALREADY_EXISTS if name is taken', async () => {
      repository.findByName.mockResolvedValue(mockTag)

      await expect(
        service.create(tenantId, { name: 'VIP', color: '#22C55E' }),
      ).rejects.toMatchObject({ code: 'TAG_NAME_ALREADY_EXISTS' })
    })
  })

  describe('update', () => {
    it('should update a tag successfully', async () => {
      const updated = { ...mockTag, name: 'Premium' }
      repository.findById.mockResolvedValue(mockTag)
      repository.findByName.mockResolvedValue(null)
      repository.update.mockResolvedValue(updated)

      const result = await service.update(tenantId, 'tag-1', { name: 'Premium' })

      expect(result.data.name).toBe('Premium')
      expect(repository.update).toHaveBeenCalledWith('tag-1', { name: 'Premium' })
    })

    it('should throw TAG_NOT_FOUND if tag does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'New Name' }),
      ).rejects.toMatchObject({ code: 'TAG_NOT_FOUND' })
    })

    it('should throw TAG_NAME_ALREADY_EXISTS if new name is taken by another tag', async () => {
      repository.findById.mockResolvedValue(mockTag)
      repository.findByName.mockResolvedValue({ ...mockTag, id: 'tag-other', name: 'Urgente' })

      await expect(
        service.update(tenantId, 'tag-1', { name: 'Urgente' }),
      ).rejects.toMatchObject({ code: 'TAG_NAME_ALREADY_EXISTS' })
    })

    it('should allow updating name to the same value (same tag id)', async () => {
      repository.findById.mockResolvedValue(mockTag)
      repository.findByName.mockResolvedValue(mockTag) // same id, same name
      repository.update.mockResolvedValue(mockTag)

      const result = await service.update(tenantId, 'tag-1', { name: 'VIP' })

      expect(result.data).toEqual(mockTag)
    })
  })

  describe('delete', () => {
    it('should delete a tag successfully', async () => {
      repository.findById.mockResolvedValue(mockTag)
      repository.delete.mockResolvedValue(mockTag)

      const result = await service.delete(tenantId, 'tag-1')

      expect(result.data.deleted).toBe(true)
      expect(repository.delete).toHaveBeenCalledWith('tag-1')
    })

    it('should throw TAG_NOT_FOUND if tag does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.delete(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'TAG_NOT_FOUND' })
    })
  })

  describe('findContactTags', () => {
    it('should return tags for a contact', async () => {
      const tag2 = { ...mockTag, id: 'tag-2', name: 'Urgente' }
      const contactTags = [
        mockContactTag('tag-1', mockTag),
        mockContactTag('tag-2', tag2),
      ]
      repository.findContactTags.mockResolvedValue(contactTags)

      const result = await service.findContactTags(tenantId, 'contact-1')

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual(mockTag)
      expect(repository.findContactTags).toHaveBeenCalledWith('contact-1')
    })
  })

  describe('addContactTag', () => {
    it('should add a tag to a contact successfully', async () => {
      repository.findById.mockResolvedValue(mockTag)
      repository.addContactTag.mockResolvedValue(mockContactTag('tag-1', mockTag))
      repository.findContactTags.mockResolvedValue([mockContactTag('tag-1', mockTag)])

      const result = await service.addContactTag(tenantId, 'contact-1', 'tag-1')

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual(mockTag)
      expect(repository.addContactTag).toHaveBeenCalledWith('contact-1', 'tag-1')
    })

    it('should be idempotent when tag is already added', async () => {
      repository.findById.mockResolvedValue(mockTag)
      repository.addContactTag.mockResolvedValue(mockContactTag('tag-1', mockTag))
      repository.findContactTags.mockResolvedValue([mockContactTag('tag-1', mockTag)])

      const result = await service.addContactTag(tenantId, 'contact-1', 'tag-1')

      expect(result.data).toHaveLength(1)
      expect(repository.addContactTag).toHaveBeenCalledWith('contact-1', 'tag-1')
    })

    it('should throw TAG_NOT_FOUND if tag does not belong to tenant', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.addContactTag(tenantId, 'contact-1', 'nonexistent'),
      ).rejects.toMatchObject({ code: 'TAG_NOT_FOUND' })
    })
  })

  describe('removeContactTag', () => {
    it('should remove a tag from a contact successfully', async () => {
      repository.removeContactTag.mockResolvedValue({ count: 1 })
      repository.findContactTags.mockResolvedValue([])

      const result = await service.removeContactTag(tenantId, 'contact-1', 'tag-1')

      expect(result.data).toHaveLength(0)
      expect(repository.removeContactTag).toHaveBeenCalledWith('contact-1', 'tag-1')
    })

    it('should be idempotent when tag was not present', async () => {
      repository.removeContactTag.mockResolvedValue({ count: 0 })
      repository.findContactTags.mockResolvedValue([])

      const result = await service.removeContactTag(tenantId, 'contact-1', 'tag-nonexistent')

      expect(result.data).toHaveLength(0)
      expect(repository.removeContactTag).toHaveBeenCalledWith('contact-1', 'tag-nonexistent')
    })
  })

  describe('seedDefaultTags', () => {
    it('should create 6 default tags', async () => {
      repository.createMany.mockResolvedValue({ count: 6 })

      await service.seedDefaultTags(tenantId)

      expect(repository.createMany).toHaveBeenCalledWith(tenantId, [
        { name: 'VIP', color: '#22C55E' },
        { name: 'Novo Cliente', color: '#3B82F6' },
        { name: 'Indicacao', color: '#F59E0B' },
        { name: 'Recompra', color: '#F97316' },
        { name: 'Urgente', color: '#EF4444' },
        { name: 'Parceiro', color: '#8B5CF6' },
      ])
    })
  })
})
