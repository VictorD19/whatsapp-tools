import { Injectable } from '@nestjs/common'
import { ContactListsRepository } from './contact-lists.repository'
import { AppException } from '@core/errors/app.exception'
import type { ContactListFiltersDto } from './dto/contact-list-filters.dto'
import type { CreateContactListDto } from './dto/create-contact-list.dto'
import type { ExportContactsDto } from './dto/export-contacts.dto'

@Injectable()
export class ContactListsService {
  constructor(private readonly repository: ContactListsRepository) {}

  async findMany(tenantId: string, filters: ContactListFiltersDto) {
    const { lists, total } = await this.repository.findMany(tenantId, filters)
    const totalPages = Math.ceil(total / filters.limit)

    return {
      data: lists,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const list = await this.repository.findByIdWithContacts(tenantId, id)
    if (!list) {
      throw AppException.notFound('CONTACT_LIST_NOT_FOUND', 'Lista de contatos não encontrada')
    }
    return { data: list }
  }

  async create(tenantId: string, dto: CreateContactListDto) {
    const list = await this.repository.create(
      tenantId,
      dto.name,
      dto.description,
      dto.contactIds,
    )
    return { data: list }
  }

  async remove(tenantId: string, id: string) {
    const list = await this.repository.findById(tenantId, id)
    if (!list) {
      throw AppException.notFound('CONTACT_LIST_NOT_FOUND', 'Lista de contatos não encontrada')
    }
    await this.repository.softDelete(id)
    return { data: { deleted: true } }
  }

  async exportContacts(tenantId: string, dto: ExportContactsDto) {
    const contacts = await this.repository.getContactsForExport(
      tenantId,
      dto.contactIds,
      dto.contactListId,
    )

    if (contacts.length === 0) {
      throw new AppException('CONTACT_LIST_EMPTY', 'Nenhum contato para exportar')
    }

    if (dto.format === 'csv') {
      return this.generateCsv(contacts)
    }
    return this.generateExcel(contacts)
  }

  private generateCsv(contacts: { phone: string; name: string | null }[]): {
    content: string
    contentType: string
    filename: string
  } {
    const header = 'phone,name'
    const rows = contacts.map(
      (c) => `${c.phone},"${(c.name || '').replace(/"/g, '""')}"`,
    )
    const content = [header, ...rows].join('\n')

    return {
      content,
      contentType: 'text/csv',
      filename: `contacts-${Date.now()}.csv`,
    }
  }

  private generateExcel(contacts: { phone: string; name: string | null }[]): {
    content: string
    contentType: string
    filename: string
  } {
    // Generate a simple TSV that Excel can open natively
    const header = 'phone\tname'
    const rows = contacts.map((c) => `${c.phone}\t${c.name || ''}`)
    const content = [header, ...rows].join('\n')

    return {
      content,
      contentType: 'application/vnd.ms-excel',
      filename: `contacts-${Date.now()}.xls`,
    }
  }
}
