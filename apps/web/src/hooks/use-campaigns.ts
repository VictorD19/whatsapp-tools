import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export interface CampaignSummary {
  adSourceId: string
  adTitle: string | null
  adSourceUrl: string | null
  conversationCount: number
  convertedCount: number
  totalValue: number
  firstConversationAt: string
  lastConversationAt: string
}

interface CampaignsResponse {
  data: CampaignSummary[]
}

export const CAMPAIGNS_QUERY_KEY = ['campaigns']

export function useCampaigns() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: () => apiGet<CampaignsResponse>('campaigns'),
  })

  return {
    campaigns: data?.data ?? [],
    initialLoading: isLoading,
    fetching: isFetching,
  }
}
