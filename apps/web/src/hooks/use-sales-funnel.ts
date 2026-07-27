import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

export type FunnelStageKey = 'started' | 'withDeal' | 'converted'

export interface FunnelStage {
  key: FunnelStageKey
  count: number
}

export interface FunnelCampaignSummary {
  adSourceId: string
  adTitle: string | null
  started: number
  withDeal: number
  converted: number
}

interface FunnelResponse {
  data: {
    stages: FunnelStage[]
    campaigns: FunnelCampaignSummary[]
  }
}

export const SALES_FUNNEL_QUERY_KEY = ['campaigns', 'funnel']

export function useSalesFunnel() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: SALES_FUNNEL_QUERY_KEY,
    queryFn: () => apiGet<FunnelResponse>('campaigns/funnel'),
  })

  return {
    stages: data?.data.stages ?? [],
    campaigns: data?.data.campaigns ?? [],
    initialLoading: isLoading,
    fetching: isFetching,
  }
}
