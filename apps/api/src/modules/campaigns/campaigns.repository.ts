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

  /**
   * Mesmo universo de conversas de findAttributedConversations, mas trazendo
   * todos os deals do contato (não só os ganhos) para o cálculo das etapas do
   * funil (iniciada -> com negociação -> convertida).
   */
  async findAttributedConversationsWithDeals(tenantId: string) {
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
        contact: {
          select: {
            adSourceId: true,
            adTitle: true,
            deals: {
              where: { tenantId, deletedAt: null },
              select: { id: true, wonAt: true },
            },
          },
        },
      },
    })
  }
}
