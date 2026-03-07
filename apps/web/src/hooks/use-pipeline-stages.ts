import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
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

export const PIPELINES_QUERY_KEY = ['pipelines']

export function usePipelineStages(pipelineId?: string) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: PIPELINES_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<Pipeline[]>>('pipelines').then((r) => r.data),
  })

  const defaultPipeline = pipelineId
    ? pipelines.find((p) => p.id === pipelineId)
    : (pipelines.find((p) => p.isDefault) ?? pipelines[0])

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(
    defaultPipeline?.id,
  )

  const resolvedId = selectedPipelineId ?? defaultPipeline?.id

  const stages = useMemo(() => {
    const pipe = pipelines.find((p) => p.id === resolvedId)
    return pipe ? [...pipe.stages].sort((a, b) => a.order - b.order) : []
  }, [pipelines, resolvedId])

  const selectPipeline = useCallback((id: string) => {
    setSelectedPipelineId(id)
  }, [])

  const activeStages = stages.filter((s) => s.type === 'ACTIVE')
  const closedStages = stages.filter((s) => s.type === 'WON' || s.type === 'LOST')

  return {
    pipelines,
    selectedPipelineId: resolvedId,
    selectPipeline,
    stages,
    activeStages,
    closedStages,
    isLoading,
  }
}
