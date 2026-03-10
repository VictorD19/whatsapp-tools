'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { KnowledgeBaseSheet } from '@/components/knowledge-base/knowledge-base-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { formatDate } from '@/lib/formatting'

interface KnowledgeBase {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  _count?: { sources: number }
  createdAt: string
}

interface ApiResponse<T> {
  data: T
}

const KB_QUERY_KEY = ['knowledge-bases']

export default function KnowledgeBasesPage() {
  const t = useTranslations('knowledgeBases')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: knowledgeBases = [], isLoading } = useQuery({
    queryKey: KB_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<KnowledgeBase[]>>('knowledge-bases').then((r) => r.data),
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingKb, setDeletingKb] = useState<KnowledgeBase | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => {
    setEditingKb(null)
    setSheetOpen(true)
  }

  const openEdit = (kb: KnowledgeBase) => {
    setEditingKb(kb)
    setSheetOpen(true)
  }

  const openDelete = (kb: KnowledgeBase) => {
    setDeletingKb(kb)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: { name: string; description?: string }) => {
    try {
      if (editingKb) {
        await apiPatch(`knowledge-bases/${editingKb.id}`, data)
        toast({ title: t('success.updated'), variant: 'success' })
      } else {
        await apiPost('knowledge-bases', data)
        toast({ title: t('success.created'), variant: 'success' })
      }
      queryClient.invalidateQueries({ queryKey: KB_QUERY_KEY })
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.creating')
      toast({ title: message, variant: 'destructive' })
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deletingKb) return
    setDeleting(true)
    try {
      await apiDelete(`knowledge-bases/${deletingKb.id}`)
      queryClient.invalidateQueries({ queryKey: KB_QUERY_KEY })
      toast({ title: t('success.deleted'), variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.deleting')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.ai') }, { label: t('breadcrumb') }]}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.ai') }, { label: t('breadcrumb') }]}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {knowledgeBases.length === 1 ? t('count', { count: knowledgeBases.length }) : t('countPlural', { count: knowledgeBases.length })}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('newButton')}
        </Button>
      </div>

      {knowledgeBases.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), onClick: openCreate }}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {knowledgeBases.map((kb) => (
            <div
              key={kb.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/assistants/knowledge-bases/${kb.id}`)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 shrink-0">
                <BookOpen className="h-5 w-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{kb.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(kb._count?.sources ?? 0) === 1 ? t('sourceCount', { count: kb._count?.sources ?? 0 }) : t('sourceCountPlural', { count: kb._count?.sources ?? 0 })}
                  {' · '}
                  {formatDate(kb.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(kb)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => openDelete(kb)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <KnowledgeBaseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        editingKb={editingKb}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('delete.description', { name: deletingKb?.name, strong: (chunks) => <strong>{chunks}</strong> })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? tc('loading') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
