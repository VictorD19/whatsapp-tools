'use client'

import React, { useState, useCallback } from 'react'
import { Plus, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { AssistantCard } from '@/components/assistants/assistant-card'
import { AssistantSheet, type AssistantFormData } from '@/components/assistants/assistant-sheet'
import { DeleteAssistantDialog } from '@/components/assistants/delete-assistant-dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { Assistant, ApiResponse } from '@/components/assistants/types'

const ASSISTANTS_QUERY_KEY = ['assistants']

export default function AssistantsPage() {
  const queryClient = useQueryClient()

  const { data: assistants = [], isLoading } = useQuery({
    queryKey: ASSISTANTS_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<Assistant[]>>('assistants').then((r) => r.data),
  })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAssistant, setDeletingAssistant] = useState<Assistant | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreateSheet = useCallback(() => {
    setEditingAssistant(null)
    setSheetOpen(true)
  }, [])

  const openEditSheet = useCallback((assistant: Assistant) => {
    setEditingAssistant(assistant)
    setSheetOpen(true)
  }, [])

  const openDeleteDialog = useCallback((assistant: Assistant) => {
    setDeletingAssistant(assistant)
    setDeleteDialogOpen(true)
  }, [])

  const handleSave = useCallback(
    async (data: AssistantFormData) => {
      setSaving(true)
      try {
        const { knowledgeBaseIds, aiToolIds, ...body } = data

        if (editingAssistant) {
          await apiPatch<ApiResponse<Assistant>>(`assistants/${editingAssistant.id}`, body)

          // Sync knowledge bases
          const currentKBs = editingAssistant.knowledgeBases.map((kb) => kb.knowledgeBaseId)
          const kbsToAdd = knowledgeBaseIds.filter((id) => !currentKBs.includes(id))
          const kbsToRemove = currentKBs.filter((id) => !knowledgeBaseIds.includes(id))
          for (const kbId of kbsToAdd) {
            await apiPost(`assistants/${editingAssistant.id}/knowledge-bases`, { knowledgeBaseId: kbId })
          }
          for (const kbId of kbsToRemove) {
            await apiDelete(`assistants/${editingAssistant.id}/knowledge-bases/${kbId}`)
          }

          // Sync tools
          const currentTools = editingAssistant.tools.map((t) => t.aiToolId)
          const toolsToAdd = aiToolIds.filter((id) => !currentTools.includes(id))
          const toolsToRemove = currentTools.filter((id) => !aiToolIds.includes(id))
          for (const toolId of toolsToAdd) {
            await apiPost(`assistants/${editingAssistant.id}/tools`, { aiToolId: toolId })
          }
          for (const toolId of toolsToRemove) {
            await apiDelete(`assistants/${editingAssistant.id}/tools/${toolId}`)
          }

          toast({ title: 'Assistente atualizado', variant: 'success' })
        } else {
          const res = await apiPost<ApiResponse<Assistant>>('assistants', body)
          const newId = res.data.id

          for (const kbId of knowledgeBaseIds) {
            await apiPost(`assistants/${newId}/knowledge-bases`, { knowledgeBaseId: kbId })
          }
          for (const toolId of aiToolIds) {
            await apiPost(`assistants/${newId}/tools`, { aiToolId: toolId })
          }

          toast({ title: 'Assistente criado', variant: 'success' })
        }

        queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY })
        setSheetOpen(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar assistente'
        toast({ title: message, variant: 'destructive' })
      } finally {
        setSaving(false)
      }
    },
    [editingAssistant, queryClient],
  )

  const handleDelete = useCallback(async () => {
    if (!deletingAssistant) return
    setSaving(true)
    try {
      await apiDelete(`assistants/${deletingAssistant.id}`)
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY })
      toast({ title: 'Assistente excluido', variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir assistente'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [deletingAssistant, queryClient])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assistentes Virtuais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure IAs para atendimento, SDR e agendamento automatico
          </p>
        </div>
        <Button onClick={openCreateSheet}>
          <Plus className="h-4 w-4" />
          Novo assistente
        </Button>
      </div>

      {assistants.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Nenhum assistente configurado"
          description="Crie um assistente de IA para automatizar o atendimento via WhatsApp"
          action={{ label: 'Criar assistente', onClick: openCreateSheet }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assistants.map((a) => (
            <AssistantCard
              key={a.id}
              assistant={a}
              onEdit={openEditSheet}
              onDelete={openDeleteDialog}
            />
          ))}
        </div>
      )}

      <AssistantSheet
        open={sheetOpen}
        assistant={editingAssistant}
        saving={saving}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      <DeleteAssistantDialog
        open={deleteDialogOpen}
        name={deletingAssistant?.name ?? ''}
        loading={saving}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
