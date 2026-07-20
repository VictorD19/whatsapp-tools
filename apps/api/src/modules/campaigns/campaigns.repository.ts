import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class CampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Conversas 1:1 atribuídas a um anúncio Click-to-WhatsApp (contact.adSourceId
   * preenchido). Agregação por campanha é feita em memória no service — volume
   * esperado (conversas com atribuição de anúncio) é baixo o suficiente para não
   * justificar SQL raw.
   */
  async findAttributedConversations(tenantId: string) {
    return this.prisma.conversation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isSandbox: false,
        contact: { adSourceId: { not: null } },
      },
      select: {
        id: true,
        createdAt: true,
        lastMessageAt: true,
        contact: {
          select: {
            adSourceId: true,
            adTitle: true,
            adSourceUrl: true,
            deals: {
              where: { tenantId, deletedAt: null, wonAt: { not: null } },
              select: { id: true, value: true },
            },
          },
        },
      },
    })
  }
}
