import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { ContactListFiltersDto } from './dto/contact-list-filters.dto'

@Injectable()
export class ContactListsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(tenantId: string, filters: ContactListFiltersDto) {
    const { search, page, limit } = filters

    const where = {
      tenantId,
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    }

    const [lists, total] = await Promise.all([
      this.prisma.contactList.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactList.count({ where }),
    ])

    return { lists, total }
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.contactList.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findByIdWithContacts(tenantId: string, id: string) {
    return this.prisma.contactList.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: {
          include: {
            contact: {
              select: { id: true, phone: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    })
  }

  async create(
    tenantId: string,
    name: string,
    description: string | undefined,
    contactIds?: string[],
    phones?: string[],
    source: 'GROUP_EXTRACT' | 'CSV_IMPORT' | 'MANUAL' | 'CRM_FILTER' = 'MANUAL',
  ) {
    let finalContactIds = contactIds

    // If contactIds not provided but phones are, look up contacts by phone
    if ((!finalContactIds || finalContactIds.length === 0) && phones && phones.length > 0) {
      const contacts = await this.prisma.contact.findMany({
        where: {
          tenantId,
          phone: { in: phones },
          deletedAt: null,
        },
        select: { id: true },
      })
      finalContactIds = contacts.map((c) => c.id)
    }

    if (!finalContactIds || finalContactIds.length === 0) {
      throw new Error('Nenhum contato encontrado')
    }

    return this.prisma.contactList.create({
      data: {
        tenantId,
        name,
        description,
        source,
        contactCount: finalContactIds.length,
        items: {
          createMany: {
            data: finalContactIds.map((contactId) => ({ contactId })),
            skipDuplicates: true,
          },
        },
      },
    })
  }

  async softDelete(id: string) {
    return this.prisma.contactList.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getContactsForExport(tenantId: string, contactIds?: string[], contactListId?: string) {
    if (contactListId) {
      const list = await this.prisma.contactList.findFirst({
        where: { id: contactListId, tenantId, deletedAt: null },
        include: {
          items: {
            include: {
              contact: {
                select: { phone: true, name: true },
              },
            },
          },
        },
      })
      return list?.items.map((item) => item.contact) ?? []
    }

    if (contactIds && contactIds.length > 0) {
      return this.prisma.contact.findMany({
        where: { id: { in: contactIds }, tenantId, deletedAt: null },
        select: { phone: true, name: true },
      })
    }

    return []
  }
}
