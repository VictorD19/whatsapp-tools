'use client'

import React, { useState } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { AiToolCard } from '@/components/ai-tools/ai-tool-card'
import { AiToolSheet, type AiTool } from '@/components/ai-tools/ai-tool-sheet'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

const AI_TOOLS_KEY = ['ai-tools']

export default function AiToolsPage() {
  React.useEffect(() => { document.title = 'Ferramentas de IA | SistemaZapChat' }, [])

  const queryClient = useQueryClient()

  const { data: tools = [], isLoading } = useQuery({
    queryKey: AI_TOOLS_KEY,
    queryFn: () => apiGet<{ data: AiTool[] }>('ai-tools').then((r) => r.data),
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<AiTool | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTool, setDeletingTool] = useState<AiTool | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditingTool(null)
    setSheetOpen(true)
  }

  const openEdit = (tool: AiTool) => {
    setEditingTool(tool)
    setSheetOpen(true)
  }

  const openDelete = (tool: AiTool) => {
    setDeletingTool(tool)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: Parameters<typeof apiPost>[1]) => {
    setSaving(true)
    try {
      if (editingTool) {
        await apiPatch(`ai-tools/${editingTool.id}`, data)
        toast({ title: 'Ferramenta atualizada', variant: 'success' })
      } else {
        await apiPost('ai-tools', data)
        toast({ title: 'Ferramenta criada', variant: 'success' })
      }
      queryClient.invalidateQueries({ queryKey: AI_TOOLS_KEY })
      setSheetOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar ferramenta'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (tool: AiTool, isActive: boolean) => {
    try {
      await apiPatch(`ai-tools/${tool.id}`, { isActive })
      queryClient.invalidateQueries({ queryKey: AI_TOOLS_KEY })
      toast({
        title: isActive ? 'Ferramenta ativada' : 'Ferramenta desativada',
        variant: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar status'
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deletingTool) return
    setSaving(true)
    try {
      await apiDelete(`ai-tools/${deletingTool.id}`)
      queryClient.invalidateQueries({ queryKey: AI_TOOLS_KEY })
      toast({ title: 'Ferramenta excluida', variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir ferramenta'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout breadcrumb={[{ label: 'Inteligência Artificial' }, { label: 'Ferramentas de IA' }]}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout breadcrumb={[{ label: 'Inteligência Artificial' }, { label: 'Ferramentas de IA' }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ferramentas de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tools.length} {tools.length === 1 ? 'ferramenta configurada' : 'ferramentas configuradas'}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova ferramenta
        </Button>
      </div>

      {/* Grid */}
      {tools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nenhuma ferramenta configurada"
          description="Crie ferramentas para seus assistentes executarem acoes automaticamente"
          action={{ label: 'Criar ferramenta', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <AiToolCard
              key={tool.id}
              tool={tool}
              onEdit={openEdit}
              onDelete={openDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <AiToolSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        tool={editingTool}
        saving={saving}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir ferramenta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a ferramenta{' '}
              <strong>{deletingTool?.name}</strong>? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
