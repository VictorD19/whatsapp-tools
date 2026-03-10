'use client'

import React, { useCallback, useState } from 'react'
import { Search, ClipboardList, Trash2, ChevronLeft, ChevronRight, Users, Plus } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { CreateListSheet } from '@/components/contact-lists/create-list-sheet'
import { useContactLists, type ContactList } from '@/hooks/use-contact-lists'
import { useDebounce } from '@/hooks/use-debounce'
import { useTranslations } from 'next-intl'
import { cn, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

const SOURCE_VARIANTS: Record<ContactList['source'], 'default' | 'info' | 'secondary' | 'success'> = {
  GROUP_EXTRACT: 'info',
  CSV_IMPORT: 'secondary',
  MANUAL: 'default',
  CRM_FILTER: 'success',
}

export default function ContactListsPage() {
  const t = useTranslations('contactLists')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')

  React.useEffect(() => { document.title = 'Listas de Contatos | SistemaZapChat' }, [])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { lists, initialLoading, fetching, meta, deleteList } = useContactLists({
    search: debouncedSearch || undefined,
    page,
  })

  // Create sheet state
  const [createOpen, setCreateOpen] = useState(false)

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingList, setDeletingList] = useState<ContactList | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((p: number) => {
    setPage(p)
  }, [])

  // Open delete dialog
  const openDelete = useCallback((list: ContactList) => {
    setDeletingList(list)
    setDeleteOpen(true)
  }, [])

  // Confirm delete
  const handleDelete = useCallback(async () => {
    if (!deletingList) return
    setDeleting(true)
    try {
      await deleteList(deletingList.id)
      setDeleteOpen(false)
      setDeletingList(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.deleting')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }, [deletingList, deleteList])

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.marketing') }, { label: tn('items.contactLists') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.total === 1 ? t('subtitle', { count: meta.total }) : t('subtitlePlural', { count: meta.total })}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('new')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {initialLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? t('emptySearch') : t('empty')}
          description={
            search
              ? t('tryOtherTerms')
              : t('emptyDescription')
          }
        />
      ) : (
        <>
          <div className={cn('rounded-md border border-border overflow-hidden transition-opacity duration-200', fetching && 'opacity-50 pointer-events-none')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('table.name')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('table.contacts')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('table.source')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('table.createdAt')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody
                key={`page-${meta.page}-${search}`}
                className="divide-y divide-border animate-fade-slide-in"
              >
                {lists.map((list) => {
                  const variant = SOURCE_VARIANTS[list.source]
                  return (
                    <tr key={list.id} data-testid={`list-row-${list.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{list.name}</span>
                          {list.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {list.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{list.contactCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={variant} className="text-xs">
                          {t(`source.${list.source}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(list.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDelete(list)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('pageOf', { page: meta.page, totalPages: meta.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => handlePageChange(meta.page + 1)}
                >
                  {t('nextPage')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create List Sheet */}
      <CreateListSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteDesc', { name: deletingList?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t('removing') : t('remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
