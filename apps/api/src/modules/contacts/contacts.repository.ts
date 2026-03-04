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
    return this.prisma.contact.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      create: { tenantId, phone, name },
      update: name ? { name } : {},
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
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }
}
