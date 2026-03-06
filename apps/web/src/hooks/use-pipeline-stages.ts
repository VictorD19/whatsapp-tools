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

export function usePipelineStages(pipelineId?: string) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(pipelineId)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPipelines = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiGet<ApiResponse<Pipeline[]>>('pipelines')
      const pipes = res.data
      setPipelines(pipes)

      if (pipes.length > 0) {
        const target = pipelineId
          ? pipes.find((p) => p.id === pipelineId)
          : (pipes.find((p) => p.isDefault) ?? pipes[0])
        if (target) {
          setSelectedPipelineId(target.id)
          setStages(target.stages.sort((a, b) => a.order - b.order))
        }
      }
    } catch {
      toast({ title: 'Erro ao carregar pipelines', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [pipelineId])

  useEffect(() => {
    fetchPipelines()
  }, [fetchPipelines])

  const selectPipeline = useCallback((id: string) => {
    setSelectedPipelineId(id)
    const pipe = pipelines.find((p) => p.id === id)
    if (pipe) {
      setStages(pipe.stages.sort((a, b) => a.order - b.order))
    }
  }, [pipelines])

  const activeStages = stages.filter((s) => s.type === 'ACTIVE')
  const closedStages = stages.filter((s) => s.type === 'WON' || s.type === 'LOST')

  return {
    pipelines,
    selectedPipelineId,
    selectPipeline,
    stages,
    activeStages,
    closedStages,
    isLoading,
    fetchPipelines,
  }
}
