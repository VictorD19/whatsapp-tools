'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  MoreHorizontal,
  Trash2,
  RefreshCw,
  CheckCircle2,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { AddContentSheet } from '@/components/knowledge-base/add-content-sheet'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '@/lib/api'

interface KnowledgeSource {
  id: string
  knowledgeBaseId: string
  type: 'FILE' | 'URL' | 'TEXT'
  name: string
  originalUrl?: string | null
  fileMimeType?: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string | null
  createdAt: string
}

interface KnowledgeBase {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  sources?: KnowledgeSource[]
}

interface ApiResponse<T> {
  data: T
}

function sourceTypeLabel(type: KnowledgeSource['type'], t: ReturnType<typeof useTranslations>) {
  if (type === 'FILE') return t('contents.typeFiles')
  return t('contents.typeQA')
}

function StatusDot({ status }: { status: KnowledgeSource['status'] }) {
  const colors: Record<KnowledgeSource['status'], string> = {
    PENDING: 'bg-muted-foreground/40',
    PROCESSING: 'bg-yellow-400 animate-pulse',
    COMPLETED: 'bg-green-500',
    FAILED: 'bg-destructive',
  }
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
}

export default function KnowledgeBaseDetailPage() {
  const t = useTranslations('knowledgeBases')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => {
    document.title = `${t('title')} | SistemaZapChat`
  }, [t])

  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const kbId = params.id

  const queryKey = ['knowledge-bases', kbId]

  const { data: kb, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiGet<ApiResponse<KnowledgeBase>>(`knowledge-bases/${kbId}`).then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data?.sources) return false
      const hasPending = data.sources.some(
        (s) => s.status === 'PENDING' || s.status === 'PROCESSING',
      )
      return hasPending ? 5000 : false
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] })
  }

  // Sheet state (edit KB info)
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  // Add content modal
  const [addModalOpen, setAddModalOpen] = useState(false)

  // Delete source dialog
  const [deletingSource, setDeletingSource] = useState<KnowledgeSource | null>(null)
  const [deletingSourceLoading, setDeletingSourceLoading] = useState(false)

  // Contents search
  const [contentsSearch, setContentsSearch] = useState('')

  const handleSaveInfo = async (data: { name: string; description?: string; isActive?: boolean }) => {
    try {
      await apiPatch(`knowledge-bases/${kbId}`, data)
      toast({ title: t('success.updated'), variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.creating')
      toast({ title: message, variant: 'destructive' })
      throw err
    }
  }

  const handleSubmitFiles = async (files: File[]) => {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      try {
        await apiUpload(`knowledge-bases/${kbId}/sources/file`, formData)
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.uploadingFile')
        toast({ title: message, variant: 'destructive' })
        throw err
      }
    }
    toast({ title: t('success.fileUploaded'), variant: 'success' })
    invalidate()
  }

  const handleSubmitQA = async (name: string, pairs: { question: string; answer: string }[]) => {
    const content = pairs
      .map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.answer}`)
      .join('\n\n')
    try {
      await apiPost(`knowledge-bases/${kbId}/sources/text`, { name, content })
      toast({ title: t('success.textAdded'), variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.addingText')
      toast({ title: message, variant: 'destructive' })
      throw err
    }
  }

  const handleDeleteSource = async () => {
    if (!deletingSource) return
    setDeletingSourceLoading(true)
    try {
      await apiDelete(`knowledge-bases/${kbId}/sources/${deletingSource.id}`)
      toast({ title: t('success.sourceDeleted'), variant: 'success' })
      invalidate()
      setDeletingSource(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.deletingSource')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setDeletingSourceLoading(false)
    }
  }

  const handleReingest = async (sourceId: string) => {
    try {
      await apiPost(`knowledge-bases/${kbId}/sources/${sourceId}/reingest`, {})
      toast({ title: t('success.reingestStarted'), variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.reingesting')
      toast({ title: message, variant: 'destructive' })
    }
  }

  const filteredSources = (kb?.sources ?? []).filter((s) =>
    s.name.toLowerCase().includes(contentsSearch.toLowerCase()),
  )

  if (isLoading) {
    return (
      <PageLayout
        breadcrumb={[{ label: tn('groups.ai') }, { label: t('breadcrumb'), href: '/assistants/knowledge-bases' }]}
        cardClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="p-6 space-y-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    )
  }

  if (!kb) {
    return (
      <PageLayout
        breadcrumb={[{ label: tn('groups.ai') }, { label: t('breadcrumb'), href: '/assistants/knowledge-bases' }]}
      >
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      breadcrumb={[
        { label: tn('groups.ai') },
        { label: t('breadcrumb'), href: '/assistants/knowledge-bases' },
        { label: kb.name },
      ]}
      cardClassName="flex flex-col overflow-hidden p-0"
    >
      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="register" className="h-full flex flex-col">
          <div className="px-6 pt-4 pb-0 border-b border-border">
            <TabsList className="bg-transparent p-0 h-auto gap-1 rounded-none">
              <TabsTrigger
                value="register"
                className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none mb-3"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {t('tabs.register')}
              </TabsTrigger>
              <TabsTrigger
                value="contents"
                className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none mb-3"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                {t('tabs.contents')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab: Cadastro */}
          <TabsContent value="register" className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-[240px_1fr] gap-8 max-w-4xl">
              {/* Left card */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{t('registration.title')}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('registration.description')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditSheetOpen(true)}
                >
                  {t('registration.editButton')}
                </Button>
              </div>

              {/* Right card — fields */}
              <div className="border border-border rounded-lg divide-y divide-border">
                <div className="px-4 py-3.5">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {t('registration.fieldName')}
                  </p>
                  <p className="text-sm">{kb.name}</p>
                </div>
                {kb.description && (
                  <div className="px-4 py-3.5">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {t('registration.fieldDescription')}
                    </p>
                    <p className="text-sm">{kb.description}</p>
                  </div>
                )}
                <div className="px-4 py-3.5">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {t('registration.fieldStatus')}
                  </p>
                  <span className="flex items-center gap-1.5 text-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${kb.isActive ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                    />
                    <span className={kb.isActive ? 'text-green-500' : 'text-muted-foreground'}>
                      {kb.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Conteúdos */}
          <TabsContent value="contents" className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-6 py-4">
              <Input
                className="max-w-xs h-9"
                placeholder={t('contents.searchPlaceholder')}
                value={contentsSearch}
                onChange={(e) => setContentsSearch(e.target.value)}
              />
              <div className="flex-1" />
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <span className="mr-1 text-base leading-none">⊕</span>
                {t('contents.addNew')}
              </Button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              <div className="border border-border rounded-md overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_200px_48px] items-center px-4 py-2.5 border-b border-border bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('contents.colName')}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('contents.colType')}
                  </span>
                  <span />
                </div>

                {filteredSources.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    {contentsSearch ? tc('noResults') : t('contents.empty')}
                  </div>
                ) : (
                  filteredSources.map((source) => (
                    <div
                      key={source.id}
                      className="grid grid-cols-[1fr_200px_48px] items-center px-4 py-3.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2 pr-4">
                        <StatusDot status={source.status} />
                        <span className="text-sm font-medium truncate">{source.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {sourceTypeLabel(source.type, t)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {source.status === 'FAILED' && (
                            <DropdownMenuItem onClick={() => handleReingest(source.id)}>
                              <RefreshCw className="h-3.5 w-3.5 mr-2" />
                              {t('sources.reingest')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingSource(source)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {tc('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}

                {/* End of list */}
                {filteredSources.length > 0 && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground border-t border-border">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('contents.endOfList')}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit KB Sheet */}
      <KnowledgeBaseSheet
        open={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSave={handleSaveInfo}
        editingKb={kb}
      />

      {/* Add Content Sheet */}
      <AddContentSheet
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmitFiles={handleSubmitFiles}
        onSubmitQA={handleSubmitQA}
      />

      {/* Delete Source Dialog */}
      <Dialog open={!!deletingSource} onOpenChange={(v) => !v && setDeletingSource(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('contents.delete.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('contents.delete.description', {
                name: deletingSource?.name ?? '',
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSource(null)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSource}
              disabled={deletingSourceLoading}
            >
              {deletingSourceLoading ? tc('loading') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
