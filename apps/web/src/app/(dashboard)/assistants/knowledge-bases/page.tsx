'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { KnowledgeBaseSheet } from '@/components/knowledge-base/knowledge-base-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiDelete } from '@/lib/api'

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
const PAGE_SIZE = 20

export default function KnowledgeBasesPage() {
  const t = useTranslations('knowledgeBases')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => {
    document.title = `${t('title')} | SistemaZapChat`
  }, [t])

  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: knowledgeBases = [], isLoading } = useQuery({
    queryKey: KB_QUERY_KEY,
    queryFn: () =>
      apiGet<ApiResponse<KnowledgeBase[]>>('knowledge-bases').then((r) => r.data),
  })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingKb, setDeletingKb] = useState<KnowledgeBase | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = knowledgeBases.filter((kb) =>
    kb.name.toLowerCase().includes(search.toLowerCase()),
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const startIdx = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(page * PAGE_SIZE, filtered.length)

  const openCreate = () => setSheetOpen(true)

  const openDelete = (kb: KnowledgeBase) => {
    setDeletingKb(kb)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: { name: string; description?: string }) => {
    try {
      const res = await apiPost<ApiResponse<KnowledgeBase>>('knowledge-bases', data)
      queryClient.invalidateQueries({ queryKey: KB_QUERY_KEY })
      toast({ title: t('success.created'), variant: 'success' })
      router.push(`/assistants/knowledge-bases/${res.data.id}`)
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

  return (
    <PageLayout
      breadcrumb={[{ label: tn('groups.ai') }, { label: t('breadcrumb') }]}
      cardClassName="flex flex-col overflow-hidden p-0"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Input
          className="max-w-xs h-9"
          placeholder={tc('search') + '...'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <div className="flex-1" />
        <Button size="sm" onClick={openCreate}>
          {t('newButton')}
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0 px-5 py-4 flex flex-col">
        {isLoading ? (
          <div className="space-y-px">
            <div className="flex items-center gap-4 px-4 py-3 border border-border rounded-t-md bg-muted/30">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-x border-b border-border last:rounded-b-md">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="border border-border rounded-md overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_180px_48px] items-center px-4 py-2.5 border-b border-border bg-muted/20">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('fields.name')}
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </span>
                <span />
              </div>

              {/* Rows */}
              {paginated.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {tc('noResults')}
                </div>
              ) : (
                paginated.map((kb) => (
                  <div
                    key={kb.id}
                    className="grid grid-cols-[1fr_180px_48px] items-center px-4 py-3.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/assistants/knowledge-bases/${kb.id}`)}
                  >
                    <span className="text-sm font-medium truncate pr-4">{kb.name}</span>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${kb.isActive ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                      />
                      <span className={kb.isActive ? 'text-green-500' : 'text-muted-foreground'}>
                        {kb.isActive ? t('status.active') : t('status.inactive')}
                      </span>
                    </span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/assistants/knowledge-bases/${kb.id}`)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            {tc('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDelete(kb)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {tc('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* End of list — fora da tabela, empurrado para o fim */}
            {paginated.length > 0 && page === totalPages && (
              <div className="flex items-center justify-center gap-2 mt-auto pt-6 pb-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('contents.endOfList')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination footer — sempre fixo no fim */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground shrink-0 mt-auto">
        {!isLoading && filtered.length > 0 ? (
          <>
            <span>
              {t('contents.showing', { start: startIdx, end: endIdx, total: filtered.length })}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-2">{t('contents.pageInfo', { current: page, total: totalPages })}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 1} onClick={() => setPage(1)}>{'«'}</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{'‹'}</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{'›'}</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === totalPages} onClick={() => setPage(totalPages)}>{'»'}</Button>
            </div>
          </>
        ) : (
          <span className="invisible">–</span>
        )}
      </div>

      <KnowledgeBaseSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('delete.description', {
                name: deletingKb?.name ?? '',
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
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
