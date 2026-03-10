'use client'

import React, { useState } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('aiTools')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

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
        toast({ title: t('success.updated'), variant: 'success' })
      } else {
        await apiPost('ai-tools', data)
        toast({ title: t('success.created'), variant: 'success' })
      }
      queryClient.invalidateQueries({ queryKey: AI_TOOLS_KEY })
      setSheetOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.creating')
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
        title: t('success.toggled'),
        variant: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.updating')
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deletingTool) return
    setSaving(true)
    try {
      await apiDelete(`ai-tools/${deletingTool.id}`)
      queryClient.invalidateQueries({ queryKey: AI_TOOLS_KEY })
      toast({ title: t('success.deleted'), variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.deleting')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.ai') }, { label: tn('items.aiTools') }]}>
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
    <PageLayout breadcrumb={[{ label: tn('groups.ai') }, { label: tn('items.aiTools') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tools.length === 1 ? t('count', { count: tools.length }) : t('countPlural', { count: tools.length })}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('newButton')}
        </Button>
      </div>

      {/* Grid */}
      {tools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), onClick: openCreate }}
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
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('delete.description', { name: deletingTool?.name, strong: (chunks) => <strong>{chunks}</strong> })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? tc('loading') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
