import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findContactListsByTenant(tenantId: string) {
    return this.prisma.contactList.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    })
  }
}
