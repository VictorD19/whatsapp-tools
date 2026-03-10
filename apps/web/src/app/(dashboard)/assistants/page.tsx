'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, Search, SlidersHorizontal } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { AssistantCard } from '@/components/assistants/assistant-card'
import { DeleteAssistantDialog } from '@/components/assistants/delete-assistant-dialog'
import { useTranslations } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { Assistant, ApiResponse } from '@/components/assistants/types'

const ASSISTANTS_QUERY_KEY = ['assistants']

export default function AssistantsPage() {
  const t = useTranslations('assistants')
  React.useEffect(() => { document.title = 'Assistentes | SistemaZapChat' }, [])

  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: assistants = [], isLoading } = useQuery({
    queryKey: ASSISTANTS_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<Assistant[]>>('assistants').then((r) => r.data),
  })

  const [search, setSearch] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAssistant, setDeletingAssistant] = useState<Assistant | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return assistants
    const q = search.toLowerCase()
    return assistants.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q),
    )
  }, [assistants, search])

  const openDeleteDialog = useCallback((assistant: Assistant) => {
    setDeletingAssistant(assistant)
    setDeleteDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deletingAssistant) return
    setDeleting(true)
    try {
      await apiDelete(`assistants/${deletingAssistant.id}`)
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY })
      toast({ title: t('success.deleted'), variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.deleting')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }, [deletingAssistant, queryClient])

  return (
    <PageLayout breadcrumb={[{ label: t('aiBreadcrumb') }, { label: t('breadcrumb') }]}>
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="ml-auto">
            <Button onClick={() => router.push('/assistants/new')}>
              <Plus className="h-4 w-4" />
              {t('addNew')}
            </Button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t('noResults', { search })}
            </div>
          ) : (
            <EmptyState
              icon={Bot}
              title={t('empty.title')}
              description={t('empty.description')}
              action={{ label: t('empty.action'), onClick: () => router.push('/assistants/new') }}
            />
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {filtered.map((a) => (
              <AssistantCard
                key={a.id}
                assistant={a}
                onEdit={(assistant) => router.push(`/assistants/${assistant.id}`)}
                onDelete={openDeleteDialog}
              />
            ))}
          </div>
        )}
      <DeleteAssistantDialog
        open={deleteDialogOpen}
        name={deletingAssistant?.name ?? ''}
        loading={deleting}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </PageLayout>
  )
}
