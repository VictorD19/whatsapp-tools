'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SourceList } from '@/components/knowledge-base/source-list'
import { AddSourceSection } from '@/components/knowledge-base/add-source-section'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiDelete, apiUpload } from '@/lib/api'

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

export default function KnowledgeBaseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const kbId = params.id

  const queryKey = ['knowledge-bases', kbId]

  const { data: kb, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiGet<ApiResponse<KnowledgeBase>>(`knowledge-bases/${kbId}`).then((r) => r.data),
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

  const handleUploadFile = async (formData: FormData) => {
    try {
      await apiUpload(`knowledge-bases/${kbId}/sources/file`, formData)
      toast({ title: 'Arquivo enviado', variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar arquivo'
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleAddUrl = async (data: { name: string; originalUrl: string }) => {
    try {
      await apiPost(`knowledge-bases/${kbId}/sources/url`, data)
      toast({ title: 'URL adicionada', variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar URL'
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleAddText = async (data: { name: string; content: string }) => {
    try {
      await apiPost(`knowledge-bases/${kbId}/sources/text`, data)
      toast({ title: 'Texto adicionado', variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar texto'
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await apiDelete(`knowledge-bases/${kbId}/sources/${sourceId}`)
      toast({ title: 'Fonte excluida', variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir fonte'
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleReingest = async (sourceId: string) => {
    try {
      await apiPost(`knowledge-bases/${kbId}/sources/${sourceId}/reingest`, {})
      toast({ title: 'Re-ingestao iniciada', variant: 'success' })
      invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao re-ingerir'
      toast({ title: message, variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-7 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!kb) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Base de conhecimento nao encontrada.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => router.push('/assistants/knowledge-bases')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => router.push('/assistants/knowledge-bases')}
        >
          Bases de Conhecimento
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{kb.name}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
            <BookOpen className="h-5 w-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{kb.name}</h1>
            {kb.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{kb.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Fontes ({kb.sources?.length ?? 0})
        </h2>
        <SourceList
          sources={kb.sources ?? []}
          onDelete={handleDeleteSource}
          onReingest={handleReingest}
        />
      </div>

      {/* Add source */}
      <AddSourceSection
        knowledgeBaseId={kbId}
        onUploadFile={handleUploadFile}
        onAddUrl={handleAddUrl}
        onAddText={handleAddText}
      />
    </div>
  )
}
