import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { DealStageType } from '@/stores/inbox.store'

export interface PipelineStage {
  id: string
  name: string
  color: string
  type: DealStageType
  order: number
}

export interface Pipeline {
  id: string
  name: string
  isDefault: boolean
  stages: PipelineStage[]
}

interface ApiResponse<T> {
  data: T
}

export function usePipelineStages() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchStages = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiGet<ApiResponse<Pipeline[]>>('pipelines')
      const defaultPipeline = res.data.find((p) => p.isDefault) ?? res.data[0]
      if (defaultPipeline) {
        setStages(defaultPipeline.stages.sort((a, b) => a.order - b.order))
      }
    } catch {
      toast({ title: 'Erro ao carregar etapas', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  const activeStages = stages.filter((s) => s.type === 'ACTIVE')
  const closedStages = stages.filter((s) => s.type === 'WON' || s.type === 'LOST')

  return { stages, activeStages, closedStages, isLoading, fetchStages }
}
