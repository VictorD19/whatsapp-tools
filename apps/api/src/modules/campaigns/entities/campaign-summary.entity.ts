export interface CampaignSummary {
  adSourceId: string
  adTitle: string | null
  adSourceUrl: string | null
  conversationCount: number
  convertedCount: number
  totalValue: number
  firstConversationAt: Date
  lastConversationAt: Date
}
