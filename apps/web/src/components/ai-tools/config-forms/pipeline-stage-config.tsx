'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

interface Pipeline {
  id: string
  name: string
  stages?: Stage[]
}

interface Stage {
  id: string
  name: string
  order: number
}

interface PipelineStageConfigProps {
  value: { pipelineId?: string; stageId?: string }
  onChange: (config: { pipelineId: string; stageId: string }) => void
}

export function PipelineStageConfig({ value, onChange }: PipelineStageConfigProps) {
  const { data: pipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => apiGet<{ data: Pipeline[] }>('pipelines').then((r) => r.data),
  })

  const { data: selectedPipeline, isLoading: loadingStages } = useQuery({
    queryKey: ['pipeline', value.pipelineId],
    queryFn: () => apiGet<{ data: Pipeline }>(`pipelines/${value.pipelineId}`).then((r) => r.data),
    enabled: !!value.pipelineId,
  })

  const stages = (selectedPipeline?.stages ?? []).sort((a, b) => a.order - b.order)

  if (loadingPipelines) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Pipeline</Label>
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Pipeline</Label>
        <Select
          value={value.pipelineId ?? ''}
          onValueChange={(v) => onChange({ pipelineId: v, stageId: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.pipelineId && (
        <div className="space-y-2">
          <Label>Etapa de destino</Label>
          {loadingStages ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select
              value={value.stageId ?? ''}
              onValueChange={(v) => onChange({ pipelineId: value.pipelineId!, stageId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  )
}
