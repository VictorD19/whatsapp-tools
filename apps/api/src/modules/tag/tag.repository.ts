import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tags ──

  async findAll(tenantId: string) {
    return this.prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.tag.findFirst({
      where: { id, tenantId },
    })
  }

  async findByName(tenantId: string, name: string) {
    return this.prisma.tag.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: 'insensitive' },
      },
    })
  }

  async create(tenantId: string, name: string, color: string) {
    return this.prisma.tag.create({
      data: { tenantId, name, color },
    })
  }

  async update(id: string, data: { name?: string; color?: string }) {
    return this.prisma.tag.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return this.prisma.tag.delete({
      where: { id },
    })
  }

  async createMany(tenantId: string, tags: Array<{ name: string; color: string }>) {
    return this.prisma.tag.createMany({
      data: tags.map((t) => ({ tenantId, name: t.name, color: t.color })),
      skipDuplicates: true,
    })
  }

  // ── ContactTags ──

  async findContactTags(contactId: string) {
    return this.prisma.contactTag.findMany({
      where: { contactId },
      include: { tag: true },
      orderBy: { tag: { name: 'asc' } },
    })
  }

  async addContactTag(contactId: string, tagId: string) {
    return this.prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId } },
      create: { contactId, tagId },
      update: {},
      include: { tag: true },
    })
  }

  async removeContactTag(contactId: string, tagId: string) {
    return this.prisma.contactTag.deleteMany({
      where: { contactId, tagId },
    })
  }
}
