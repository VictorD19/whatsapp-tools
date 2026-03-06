'use client'

import React, { useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { cn } from '@/lib/utils'
import { DealCard } from './deal-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import type { Deal } from '@/hooks/use-deal'
import type { PipelineStage } from '@/hooks/use-pipeline-stages'
import { formatCurrency } from '@/lib/formatting'

interface KanbanBoardProps {
  deals: Deal[]
  stages: PipelineStage[]
  onMoveDeal: (dealId: string, stageId: string, lostReason?: string) => Promise<Deal | null>
  onDealSelect?: (deal: Deal) => void
}

export function KanbanBoard({ deals, stages, onMoveDeal, onDealSelect }: KanbanBoardProps) {
  const [lostDialogOpen, setLostDialogOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [pendingMove, setPendingMove] = useState<{ dealId: string; stageId: string } | null>(null)

  const columnMap = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const stage of stages) {
      map.set(stage.id, [])
    }
    for (const deal of deals) {
      const arr = map.get(deal.stageId)
      if (arr) arr.push(deal)
    }
    return map
  }, [deals, stages])

  const totalValue = useMemo(() => {
    return deals
      .filter((d) => {
        const stage = stages.find((s) => s.id === d.stageId)
        return stage?.type !== 'LOST'
      })
      .reduce((acc, d) => acc + (Number(d.value) || 0), 0)
  }, [deals, stages])

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStageId = destination.droppableId

    const deal = deals.find((d) => d.id === draggableId)
    if (!deal) return

    // Block drag of closed deals
    const currentStage = stages.find((s) => s.id === deal.stageId)
    if (currentStage?.type === 'WON' || currentStage?.type === 'LOST') return

    if (deal.stageId === newStageId) return

    const targetStage = stages.find((s) => s.id === newStageId)
    if (targetStage?.type === 'LOST') {
      setPendingMove({ dealId: draggableId, stageId: newStageId })
      setLostDialogOpen(true)
      return
    }

    await onMoveDeal(draggableId, newStageId)
  }

  async function handleConfirmLost() {
    if (!pendingMove) return
    await onMoveDeal(pendingMove.dealId, pendingMove.stageId, lostReason || undefined)
    setLostDialogOpen(false)
    setLostReason('')
    setPendingMove(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pipeline total:{' '}
        <span className="font-semibold text-foreground">
          {formatCurrency(totalValue)}
        </span>
      </p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const columnDeals = columnMap.get(stage.id) ?? []
            const columnTotal = columnDeals.reduce((acc, d) => acc + (Number(d.value) || 0), 0)

            return (
              <div key={stage.id} data-testid={`kanban-column-${stage.id}`} className="flex flex-col gap-3 w-[260px] shrink-0">
                {/* Column header */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-medium">{stage.name}</span>
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-xs text-muted-foreground">
                    {columnDeals.length}
                  </span>
                </div>
                {columnTotal > 0 && (
                  <p className="text-[11px] text-muted-foreground -mt-2">
                    {formatCurrency(columnTotal)}
                  </p>
                )}

                {/* Drop zone */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex flex-col gap-2 min-h-[200px] rounded-lg p-2 transition-colors',
                        snapshot.isDraggingOver ? 'bg-muted/70' : 'bg-muted/40'
                      )}
                    >
                      {columnDeals.map((deal, index) => {
                        const dealStage = stages.find((s) => s.id === deal.stageId)
                        const isClosed = dealStage?.type === 'WON' || dealStage?.type === 'LOST'

                        return (
                          <Draggable
                            key={deal.id}
                            draggableId={deal.id}
                            index={index}
                            isDragDisabled={isClosed}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <DealCard
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                deal={deal}
                                onDealClick={onDealSelect}
                                className={cn(
                                  dragSnapshot.isDragging && 'opacity-80 rotate-2',
                                  isClosed && 'opacity-60'
                                )}
                              />
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                      {columnDeals.length === 0 && (
                        <div className="flex flex-1 items-center justify-center py-8">
                          <p className="text-xs text-muted-foreground/60">Sem negócios</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Lost reason dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={(v) => {
        if (!v) {
          setLostDialogOpen(false)
          setPendingMove(null)
          setLostReason('')
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>Informe o motivo da perda (opcional).</DialogDescription>
          </DialogHeader>
          <Input
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Ex: Escolheu concorrente, sem orçamento..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmLost()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setLostDialogOpen(false)
              setPendingMove(null)
              setLostReason('')
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmLost}>
              Confirmar perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
