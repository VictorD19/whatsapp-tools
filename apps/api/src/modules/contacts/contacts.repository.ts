import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { ContactFiltersDto } from './dto/contact-filters.dto'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { UpdateContactDto } from './dto/update-contact.dto'

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.contact.findFirst({
      where: { tenantId, phone, deletedAt: null },
    })
  }

  async findOrCreate(tenantId: string, phone: string, name?: string) {
    // Only treat as real name if it's not just digits (avoid storing phone as name)
    const isRealName = name ? !/^\d+$/.test(name) : false

    return this.prisma.contact.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      create: { tenantId, phone, name: isRealName ? name : undefined },
      update: isRealName ? { name } : {},
    })
  }

  async updateAvatarUrl(id: string, avatarUrl: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { avatarUrl },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.contact.findMany({
      where: { tenantId, deletedAt: null, NOT: { phone: { contains: '@g.us' } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findMany(tenantId: string, filters: ContactFiltersDto) {
    const { search, page, limit, includeDeleted } = filters

    const where = {
      tenantId,
      NOT: { phone: { contains: '@g.us' } },
      ...(!includeDeleted && { deletedAt: null }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contactTags: { include: { tag: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ])

    return { contacts, total }
  }

  async create(tenantId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: {
        tenantId,
        phone: dto.phone,
        name: dto.name,
      },
    })
  }

  async update(id: string, dto: UpdateContactDto) {
    return this.prisma.contact.update({
      where: { id },
      data: dto,
    })
  }

  async softDelete(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
