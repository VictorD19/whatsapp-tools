import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.contact.findFirst({
      where: { tenantId, phone, deletedAt: null },
    })
  }

  async findOrCreate(tenantId: string, phone: string, name?: string) {
    const existing = await this.findByPhone(tenantId, phone)
    if (existing) return existing

    return this.prisma.contact.create({
      data: { tenantId, phone, name },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.contact.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }
}
