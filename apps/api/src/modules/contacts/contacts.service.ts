import { Injectable } from '@nestjs/common'
import { ContactsRepository } from './contacts.repository'
import { AppException } from '@core/errors/app.exception'
import type { ContactFiltersDto } from './dto/contact-filters.dto'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { UpdateContactDto } from './dto/update-contact.dto'

/**
 * Normaliza número de telefone brasileiro:
 * - Remove caracteres não numéricos
 * - Celulares BR com 12 dígitos (55 + DDD + 8 dígitos) → adiciona o 9 prefixo
 *   Ex: 554998218294 → 5549998218294
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Brasil: 55 + DDD (2) + número (8) = 12 dígitos → adiciona 9 antes do número
  if (digits.startsWith('55') && digits.length === 12) {
    const ddd = digits.slice(2, 4)
    const number = digits.slice(4)
    // Apenas celulares (começam com 6-9)
    if (/^[6-9]/.test(number)) {
      return `55${ddd}9${number}`
    }
  }

  return digits
}

@Injectable()
export class ContactsService {
  constructor(private readonly repository: ContactsRepository) {}

  async findOrCreate(tenantId: string, phone: string, name?: string) {
    // Group JIDs (@g.us) are kept as-is — they are unique identifiers, not phone numbers
    const normalized = phone.includes('@g.us') ? phone : normalizePhone(phone)
    return this.repository.findOrCreate(tenantId, normalized, name)
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
    const normalizedPhone = normalizePhone(dto.phone)
    const existing = await this.repository.findByPhone(tenantId, normalizedPhone)
    if (existing) {
      throw new AppException('CONTACT_DUPLICATE', 'Já existe um contato com este telefone')
    }

    const contact = await this.repository.create(tenantId, { ...dto, phone: normalizedPhone })
    return { data: contact }
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto) {
    const contact = await this.repository.findById(tenantId, id)
    if (!contact) {
      throw AppException.notFound('CONTACT_NOT_FOUND', 'Contato não encontrado')
    }

    const normalizedPhone = dto.phone ? normalizePhone(dto.phone) : undefined
    if (normalizedPhone && normalizedPhone !== contact.phone) {
      const existing = await this.repository.findByPhone(tenantId, normalizedPhone)
      if (existing) {
        throw new AppException('CONTACT_DUPLICATE', 'Já existe um contato com este telefone')
      }
    }

    const updated = await this.repository.update(id, { ...dto, ...(normalizedPhone && { phone: normalizedPhone }) })
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
