import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import { KanbanBoard } from '@/components/crm/kanban-board'

export const metadata: Metadata = { title: 'CRM' }

export default function CRMPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold">CRM — Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus leads e oportunidades</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Novo negócio
        </Button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        <KanbanBoard />
      </div>
    </div>
  )
}
