'use client'

import React, { useState } from 'react'
import { FileText, Globe, Type, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

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

interface SourceListProps {
  sources: KnowledgeSource[]
  onDelete: (sourceId: string) => Promise<void>
  onReingest: (sourceId: string) => Promise<void>
}

const typeIcons: Record<string, React.ElementType> = {
  FILE: FileText,
  URL: Globe,
  TEXT: Type,
}

const typeLabels: Record<string, string> = {
  FILE: 'Arquivo',
  URL: 'URL',
  TEXT: 'Texto',
}

function StatusBadge({ status }: { status: KnowledgeSource['status'] }) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="secondary">Pendente</Badge>
    case 'PROCESSING':
      return (
        <Badge variant="warning" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processando
        </Badge>
      )
    case 'COMPLETED':
      return <Badge variant="success">Concluido</Badge>
    case 'FAILED':
      return <Badge variant="destructive">Falhou</Badge>
  }
}

export function SourceList({ sources, onDelete, onReingest }: SourceListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSource, setDeletingSource] = useState<KnowledgeSource | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reingesting, setReingesting] = useState<string | null>(null)

  const handleDeleteClick = (source: KnowledgeSource) => {
    setDeletingSource(source)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingSource) return
    setDeleting(true)
    try {
      await onDelete(deletingSource.id)
      setDeleteDialogOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleReingest = async (sourceId: string) => {
    setReingesting(sourceId)
    try {
      await onReingest(sourceId)
    } finally {
      setReingesting(null)
    }
  }

  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma fonte adicionada. Adicione arquivos, URLs ou textos abaixo.
      </p>
    )
  }

  return (
    <>
      <div className="rounded-md border border-border overflow-hidden">
        {sources.map((source) => {
          const Icon = typeIcons[source.type] ?? FileText
          return (
            <div
              key={source.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{source.name}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[source.type]}</p>
              </div>
              <StatusBadge status={source.status} />
              <div className="flex items-center gap-0.5">
                {source.status === 'FAILED' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={reingesting === source.id}
                    onClick={() => handleReingest(source.id)}
                    title="Re-ingerir"
                  >
                    {reingesting === source.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(source)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir fonte</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a fonte{' '}
              <strong>{deletingSource?.name}</strong>? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
