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
import { cn, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

const SOURCE_LABELS: Record<ContactList['source'], { label: string; variant: 'default' | 'info' | 'secondary' | 'success' }> = {
  GROUP_EXTRACT: { label: 'Grupo', variant: 'info' },
  CSV_IMPORT: { label: 'CSV', variant: 'secondary' },
  MANUAL: { label: 'Manual', variant: 'default' },
  CRM_FILTER: { label: 'CRM', variant: 'success' },
}

export default function ContactListsPage() {
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
      const message = err instanceof Error ? err.message : 'Erro ao remover lista'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }, [deletingList, deleteList])

  return (
    <PageLayout breadcrumb={[{ label: 'Marketing' }, { label: 'Listas de Contatos' }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Listas de Contatos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.total} lista{meta.total !== 1 ? 's' : ''} cadastrada{meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Lista
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
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
          title={search ? 'Nenhuma lista encontrada' : 'Nenhuma lista ainda'}
          description={
            search
              ? 'Tente buscar com outros termos'
              : 'Listas sao criadas ao extrair contatos de grupos ou importar CSV'
          }
        />
      ) : (
        <>
          <div className={cn('rounded-md border border-border overflow-hidden transition-opacity duration-200', fetching && 'opacity-50 pointer-events-none')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Contatos
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Origem
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Criado em
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody
                key={`page-${meta.page}-${search}`}
                className="divide-y divide-border animate-fade-slide-in"
              >
                {lists.map((list) => {
                  const source = SOURCE_LABELS[list.source]
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
                        <Badge variant={source.variant} className="text-xs">
                          {source.label}
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
                Pagina {meta.page} de {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => handlePageChange(meta.page + 1)}
                >
                  Proximo
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
            <DialogTitle>Remover lista</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a lista{' '}
              <strong>{deletingList?.name}</strong>? Os contatos nao serao excluidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
