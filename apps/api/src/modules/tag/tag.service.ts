import { Injectable, HttpStatus } from '@nestjs/common'
import { TagRepository } from './tag.repository'
import { AppException } from '@core/errors/app.exception'
import { CreateTagDto } from './dto/create-tag.dto'
import { UpdateTagDto } from './dto/update-tag.dto'

const DEFAULT_TAGS = [
  { name: 'VIP', color: '#22C55E' },
  { name: 'Novo Cliente', color: '#3B82F6' },
  { name: 'Indicacao', color: '#F59E0B' },
  { name: 'Recompra', color: '#F97316' },
  { name: 'Urgente', color: '#EF4444' },
  { name: 'Parceiro', color: '#8B5CF6' },
]

@Injectable()
export class TagService {
  constructor(private readonly repository: TagRepository) {}

  // ── Tag CRUD ──

  async findAll(tenantId: string) {
    const tags = await this.repository.findAll(tenantId)
    return { data: tags }
  }

  async create(tenantId: string, dto: CreateTagDto) {
    const existing = await this.repository.findByName(tenantId, dto.name)
    if (existing) {
      throw new AppException(
        'TAG_NAME_ALREADY_EXISTS',
        'Ja existe uma tag com este nome',
        { name: dto.name },
        HttpStatus.CONFLICT,
      )
    }

    const tag = await this.repository.create(tenantId, dto.name, dto.color)
    return { data: tag }
  }

  async update(tenantId: string, id: string, dto: UpdateTagDto) {
    const tag = await this.repository.findById(tenantId, id)
    if (!tag) {
      throw AppException.notFound('TAG_NOT_FOUND', 'Tag nao encontrada', { id })
    }

    if (dto.name) {
      const existing = await this.repository.findByName(tenantId, dto.name)
      if (existing && existing.id !== id) {
        throw new AppException(
          'TAG_NAME_ALREADY_EXISTS',
          'Ja existe uma tag com este nome',
          { name: dto.name },
          HttpStatus.CONFLICT,
        )
      }
    }

    const updated = await this.repository.update(id, dto)
    return { data: updated }
  }

  async delete(tenantId: string, id: string) {
    const tag = await this.repository.findById(tenantId, id)
    if (!tag) {
      throw AppException.notFound('TAG_NOT_FOUND', 'Tag nao encontrada', { id })
    }

    await this.repository.delete(id)
    return { data: { deleted: true } }
  }

  // ── ContactTag ──

  async findContactTags(tenantId: string, contactId: string) {
    const contactTags = await this.repository.findContactTags(contactId)
    return { data: contactTags.map((ct) => ct.tag) }
  }

  async addContactTag(tenantId: string, contactId: string, tagId: string) {
    // Validate tag belongs to same tenant
    const tag = await this.repository.findById(tenantId, tagId)
    if (!tag) {
      throw AppException.notFound('TAG_NOT_FOUND', 'Tag nao encontrada', { tagId })
    }

    // Idempotent: upsert
    await this.repository.addContactTag(contactId, tagId)

    // Return updated list
    const contactTags = await this.repository.findContactTags(contactId)
    return { data: contactTags.map((ct) => ct.tag) }
  }

  async removeContactTag(tenantId: string, contactId: string, tagId: string) {
    // Idempotent: deleteMany won't throw if not found
    await this.repository.removeContactTag(contactId, tagId)

    // Return updated list
    const contactTags = await this.repository.findContactTags(contactId)
    return { data: contactTags.map((ct) => ct.tag) }
  }

  // ── Seed default tags ──

  async seedDefaultTags(tenantId: string) {
    await this.repository.createMany(tenantId, DEFAULT_TAGS)
  }
}
