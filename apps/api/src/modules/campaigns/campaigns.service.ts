import { Injectable } from '@nestjs/common'
import { CampaignsRepository } from './campaigns.repository'
import type { CampaignSummary } from './entities/campaign-summary.entity'
import type { FunnelCampaignSummary, FunnelSummary } from './entities/funnel-summary.entity'

@Injectable()
export class CampaignsService {
  constructor(private readonly repository: CampaignsRepository) {}

  async getFunnel(tenantId: string): Promise<{ data: FunnelSummary }> {
    const conversations = await this.repository.findAttributedConversationsWithDeals(tenantId)

    const byAdSourceId = new Map<string, FunnelCampaignSummary>()
    let started = 0
    let withDeal = 0
    let converted = 0

    for (const conversation of conversations) {
      const adSourceId = conversation.contact.adSourceId as string
      const deals = conversation.contact.deals
      const hasDeal = deals.length > 0
      const hasWonDeal = deals.some((deal) => deal.wonAt !== null)

      let campaign = byAdSourceId.get(adSourceId)
      if (!campaign) {
        campaign = {
          adSourceId,
          adTitle: conversation.contact.adTitle,
          started: 0,
          withDeal: 0,
          converted: 0,
        }
        byAdSourceId.set(adSourceId, campaign)
      }

      started += 1
      campaign.started += 1
      if (hasDeal) {
        withDeal += 1
        campaign.withDeal += 1
      }
      if (hasWonDeal) {
        converted += 1
        campaign.converted += 1
      }
    }

    const campaigns = Array.from(byAdSourceId.values()).sort((a, b) => b.started - a.started)

    return {
      data: {
        stages: [
          { key: 'started', count: started },
          { key: 'withDeal', count: withDeal },
          { key: 'converted', count: converted },
        ],
        campaigns,
      },
    }
  }

  async findAll(tenantId: string) {
    const conversations = await this.repository.findAttributedConversations(tenantId)

    const byAdSourceId = new Map<string, CampaignSummary>()
    // Um contato pode aparecer em mais de uma conversa (ex: reaberta em outra
    // instância) — dedupa deals ganhos por id para não somar o mesmo valor 2x.
    const countedDealIds = new Map<string, Set<string>>()

    for (const conversation of conversations) {
      const adSourceId = conversation.contact.adSourceId as string
      const conversationDate = conversation.lastMessageAt ?? conversation.createdAt
      const wonDeals = conversation.contact.deals

      let existing = byAdSourceId.get(adSourceId)
      let dealIds = countedDealIds.get(adSourceId)

      if (!existing) {
        existing = {
          adSourceId,
          adTitle: conversation.contact.adTitle,
          adSourceUrl: conversation.contact.adSourceUrl,
          conversationCount: 0,
          convertedCount: 0,
          totalValue: 0,
          firstConversationAt: conversation.createdAt,
          lastConversationAt: conversationDate,
        }
        byAdSourceId.set(adSourceId, existing)
        dealIds = new Set<string>()
        countedDealIds.set(adSourceId, dealIds)
      }

      existing.conversationCount += 1
      if (conversation.createdAt < existing.firstConversationAt) {
        existing.firstConversationAt = conversation.createdAt
      }
      if (conversationDate > existing.lastConversationAt) {
        existing.lastConversationAt = conversationDate
      }

      if (wonDeals.length > 0) {
        existing.convertedCount += 1
        for (const deal of wonDeals) {
          if (dealIds!.has(deal.id)) continue
          dealIds!.add(deal.id)
          existing.totalValue += deal.value ? Number(deal.value) : 0
        }
      }
    }

    const campaigns = Array.from(byAdSourceId.values()).sort(
      (a, b) => b.conversationCount - a.conversationCount,
    )

    return { data: campaigns }
  }
}
