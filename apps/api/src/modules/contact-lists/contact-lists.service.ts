import { Injectable } from '@nestjs/common'
import { ContactListsRepository } from './contact-lists.repository'
import { ContactsService } from '../contacts/contacts.service'
import { AppException } from '@core/errors/app.exception'
import type { ContactListFiltersDto } from './dto/contact-list-filters.dto'
import type { CreateContactListDto } from './dto/create-contact-list.dto'
import type { ExportContactsDto } from './dto/export-contacts.dto'

const PHONE_HEADERS = ['phone', 'telefone', 'numero', 'número', 'celular']
const NAME_HEADERS = ['name', 'nome', 'nombre']

@Injectable()
export class ContactListsService {
  constructor(
    private readonly repository: ContactListsRepository,
    private readonly contactsService: ContactsService,
  ) {}

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
      dto.phones,
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

  async importCsv(
    tenantId: string,
    name: string,
    csvBuffer: Buffer,
    description?: string,
  ) {
    const rows = this.parseCsv(csvBuffer)

    if (rows.length === 0) {
      throw new AppException('CSV_EMPTY', 'O arquivo CSV não contém contatos válidos')
    }

    const contactIds: string[] = []
    for (const row of rows) {
      const contact = await this.contactsService.findOrCreate(
        tenantId,
        row.phone,
        row.name,
      )
      contactIds.push(contact.id)
    }

    const list = await this.repository.create(
      tenantId,
      name,
      description,
      contactIds,
      undefined,
      'CSV_IMPORT',
    )

    return { data: list }
  }

  parseCsv(buffer: Buffer): Array<{ phone: string; name?: string }> {
    const content = buffer.toString('utf-8').trim()
    if (!content) {
      throw new AppException('CSV_EMPTY', 'O arquivo CSV está vazio')
    }

    const lines = content.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      throw new AppException('CSV_EMPTY', 'O arquivo CSV não contém dados além do cabeçalho')
    }

    const headerLine = lines[0].toLowerCase().trim()
    const separator = headerLine.includes(';') ? ';' : ','
    const headers = headerLine.split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ''))

    const phoneIdx = headers.findIndex((h) => PHONE_HEADERS.includes(h))
    if (phoneIdx === -1) {
      throw new AppException(
        'CSV_PARSE_ERROR',
        `Cabeçalho "phone" não encontrado. Cabeçalhos aceitos: ${PHONE_HEADERS.join(', ')}`,
      )
    }

    const nameIdx = headers.findIndex((h) => NAME_HEADERS.includes(h))

    const results: Array<{ phone: string; name?: string }> = []

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i], separator)
      const phone = (cols[phoneIdx] || '').replace(/\D/g, '').trim()
      if (!phone || phone.length < 8) continue

      const name = nameIdx >= 0 ? (cols[nameIdx] || '').trim() : undefined
      results.push({ phone, name: name || undefined })
    }

    return results
  }

  private parseCsvLine(line: string, separator: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === separator && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
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
