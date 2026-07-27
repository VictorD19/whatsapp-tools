export interface FunnelStage {
  key: 'started' | 'withDeal' | 'converted'
  count: number
}

export interface FunnelCampaignSummary {
  adSourceId: string
  adTitle: string | null
  started: number
  withDeal: number
  converted: number
}

export interface FunnelSummary {
  stages: FunnelStage[]
  campaigns: FunnelCampaignSummary[]
}
