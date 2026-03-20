'use client'

import React, { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AssistantForm, type AssistantFormData } from '@/components/assistants/assistant-form'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { Assistant, ApiResponse } from '@/components/assistants/types'

export default function EditAssistantPage() {
  const t = useTranslations('assistants')
  React.useEffect(() => { document.title = 'Editar Assistente | SistemaZapChat' }, [])

  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: assistant, isLoading } = useQuery({
    queryKey: ['assistants', id],
    queryFn: () => apiGet<ApiResponse<Assistant>>(`assistants/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  const handleSave = useCallback(
    async (data: AssistantFormData) => {
      if (!assistant) return
      setSaving(true)
      try {
        const { knowledgeBaseIds, aiToolIds, ...body } = data
        await apiPatch<ApiResponse<Assistant>>(`assistants/${id}`, body)

        // Sync knowledge bases
        const currentKBs = assistant.knowledgeBases.map((kb) => kb.knowledgeBaseId)
        const kbsToAdd = knowledgeBaseIds.filter((kbId) => !currentKBs.includes(kbId))
        const kbsToRemove = currentKBs.filter((kbId) => !knowledgeBaseIds.includes(kbId))
        for (const kbId of kbsToAdd) {
          await apiPost(`assistants/${id}/knowledge-bases`, { knowledgeBaseId: kbId })
        }
        for (const kbId of kbsToRemove) {
          await apiDelete(`assistants/${id}/knowledge-bases/${kbId}`)
        }

        // Sync tools
        const currentTools = assistant.tools.map((tool) => tool.aiToolId)
        const toolsToAdd = aiToolIds.filter((toolId) => !currentTools.includes(toolId))
        const toolsToRemove = currentTools.filter((toolId) => !aiToolIds.includes(toolId))
        for (const toolId of toolsToAdd) {
          await apiPost(`assistants/${id}/tools`, { aiToolId: toolId })
        }
        for (const toolId of toolsToRemove) {
          await apiDelete(`assistants/${id}/tools/${toolId}`)
        }

        queryClient.invalidateQueries({ queryKey: ['assistants'] })
        queryClient.invalidateQueries({ queryKey: ['assistants', id] })
        toast({ title: t('success.updated'), variant: 'success' })
        router.push('/assistants')
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.saving')
        toast({ title: message, variant: 'destructive' })
      } finally {
        setSaving(false)
      }
    },
    [assistant, id, router, queryClient],
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (!assistant) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t('notFound')}</div>
    )
  }

  return (
    <AssistantForm assistant={assistant} saving={saving} onSave={handleSave} />
  )
}
