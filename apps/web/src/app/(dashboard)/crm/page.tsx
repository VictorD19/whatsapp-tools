'use client'

import React, { useMemo, useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/crm/kanban-board'
import { DealFilters } from '@/components/crm/deal-filters'
import { DealFormSheet } from '@/components/crm/deal-form-sheet'
import { DealDetailSheet } from '@/components/crm/deal-detail-sheet'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useDeal, type Deal } from '@/hooks/use-deal'

export default function CRMPage() {
  const { pipelines, selectedPipelineId, selectPipeline, stages, isLoading: isLoadingStages } = usePipelineStages()
  const { deals, isLoadingDeals, setCachedDeals, moveDeal } = useDeal(
    selectedPipelineId ? { pipelineId: selectedPipelineId } : undefined,
  )

  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null)

  const filteredDeals = useMemo(() => {
    let result = deals
    if (filterAssignee && filterAssignee !== 'all') {
      result = result.filter((d) => d.assignedToId === filterAssignee)
    }
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase()
      result = result.filter((d) => {
        const contactName = d.contact.name?.toLowerCase() ?? ''
        const title = d.title?.toLowerCase() ?? ''
        const phone = d.contact.phone.toLowerCase()
        return contactName.includes(q) || title.includes(q) || phone.includes(q)
      })
    }
    return result
  }, [deals, filterAssignee, filterSearch])

  async function handleMoveDeal(dealId: string, stageId: string, lostReason?: string) {
    // Optimistic update
    const deal = deals.find((d) => d.id === dealId)
    if (!deal) return null
    const newStage = stages.find((s) => s.id === stageId)
    if (!newStage) return null

    const optimistic: Deal = {
      ...deal,
      stageId,
      stage: newStage,
      wonAt: newStage.type === 'WON' ? new Date().toISOString() : deal.wonAt,
      lostAt: newStage.type === 'LOST' ? new Date().toISOString() : deal.lostAt,
      lostReason: newStage.type === 'LOST' ? (lostReason ?? null) : deal.lostReason,
    }
    setCachedDeals((prev) => prev.map((d) => (d.id === dealId ? optimistic : d)))

    const result = await moveDeal(dealId, stageId, lostReason)
    if (!result) {
      // Revert on failure
      setCachedDeals((prev) => prev.map((d) => (d.id === dealId ? deal : d)))
    }
    return result
  }

  function handleDealCreated() {
    setCreateOpen(false)
  }

  function handleDealUpdated() {
    // invalidateQueries inside useDeal mutations handles refetch
  }

  function handleDealDeleted() {
    setDetailDeal(null)
  }

  function handlePipelineChange(id: string) {
    selectPipeline(id)
  }

  const isLoading = isLoadingStages || isLoadingDeals

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">CRM — Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus leads e oportunidades</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo negócio
        </Button>
      </div>

      {/* Filters */}
      <DealFilters
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId ?? ''}
        onPipelineChange={handlePipelineChange}
        assigneeId={filterAssignee}
        onAssigneeChange={setFilterAssignee}
        search={filterSearch}
        onSearchChange={setFilterSearch}
        deals={deals}
      />

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Nenhum pipeline configurado. Crie um pipeline em Configurações.
            </p>
          </div>
        ) : (
          <KanbanBoard
            deals={filteredDeals}
            stages={stages}
            onMoveDeal={handleMoveDeal}
            onDealSelect={(deal) => setDetailDeal(deal)}
          />
        )}
      </div>

      {/* Create deal sheet */}
      <DealFormSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleDealCreated}
        pipelines={pipelines}
        defaultPipelineId={selectedPipelineId}
      />

      {/* Deal detail sheet */}
      {detailDeal && (
        <DealDetailSheet
          open={!!detailDeal}
          onClose={() => setDetailDeal(null)}
          deal={detailDeal}
          stages={stages}
          onUpdated={handleDealUpdated}
          onDeleted={handleDealDeleted}
        />
      )}
    </div>
  )
}
