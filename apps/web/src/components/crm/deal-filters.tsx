'use client'

import React, { useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Pipeline } from '@/hooks/use-pipeline-stages'
import type { Deal } from '@/hooks/use-deal'

interface DealFiltersProps {
  pipelines: Pipeline[]
  selectedPipelineId: string
  onPipelineChange: (id: string) => void
  assigneeId: string
  onAssigneeChange: (id: string) => void
  search: string
  onSearchChange: (value: string) => void
  deals: Deal[]
}

export function DealFilters({
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  assigneeId,
  onAssigneeChange,
  search,
  onSearchChange,
  deals,
}: DealFiltersProps) {
  const assignees = useMemo(() => {
    const map = new Map<string, string>()
    for (const deal of deals) {
      if (deal.assignedTo) {
        map.set(deal.assignedTo.id, deal.assignedTo.name)
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [deals])

  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-3 shrink-0 flex-wrap">
      {/* Pipeline selector */}
      {pipelines.length > 1 && (
        <Select value={selectedPipelineId} onValueChange={onPipelineChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Assignee filter */}
      <Select value={assigneeId} onValueChange={onAssigneeChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Atendente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {assignees.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, título ou telefone..."
          className="h-8 pl-8 text-xs"
        />
      </div>
    </div>
  )
}
