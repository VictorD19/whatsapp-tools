import { Injectable } from '@nestjs/common'
import { ContactsRepository } from './contacts.repository'
import { AppException } from '@core/errors/app.exception'
import type { ContactFiltersDto } from './dto/contact-filters.dto'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { UpdateContactDto } from './dto/update-contact.dto'

@Injectable()
export class ContactsService {
  constructor(private readonly repository: ContactsRepository) {}

  async findOrCreate(tenantId: string, phone: string, name?: string) {
    return this.repository.findOrCreate(tenantId, phone, name)
  }

  async updateAvatarUrl(id: string, avatarUrl: string) {
    return this.repository.updateAvatarUrl(id, avatarUrl)
  }

  async findById(tenantId: string, id: string) {
    const contact = await this.repository.findById(tenantId, id)
    if (!contact) {
      throw AppException.notFound('CONTACT_NOT_FOUND', 'Contato não encontrado')
    }
    return contact
  }

  async findAll(tenantId: string) {
    return this.repository.findAllByTenant(tenantId)
  }

  async findMany(tenantId: string, filters: ContactFiltersDto) {
    const { contacts, total } = await this.repository.findMany(tenantId, filters)
    const totalPages = Math.ceil(total / filters.limit)

    return {
      data: contacts,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    }
  }

  async create(tenantId: string, dto: CreateContactDto) {
    const existing = await this.repository.findByPhone(tenantId, dto.phone)
    if (existing) {
      throw new AppException('CONTACT_DUPLICATE', 'Já existe um contato com este telefone')
    }

    const contact = await this.repository.create(tenantId, dto)
    return { data: contact }
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto) {
    const contact = await this.repository.findById(tenantId, id)
    if (!contact) {
      throw AppException.notFound('CONTACT_NOT_FOUND', 'Contato não encontrado')
    }

    if (dto.phone && dto.phone !== contact.phone) {
      const existing = await this.repository.findByPhone(tenantId, dto.phone)
      if (existing) {
        throw new AppException('CONTACT_DUPLICATE', 'Já existe um contato com este telefone')
      }
    }

    const updated = await this.repository.update(id, dto)
    return { data: updated }
  }

  async remove(tenantId: string, id: string) {
    const contact = await this.repository.findById(tenantId, id)
    if (!contact) {
      throw AppException.notFound('CONTACT_NOT_FOUND', 'Contato não encontrado')
    }

    await this.repository.softDelete(id)
    return { data: { deleted: true } }
  }
}
