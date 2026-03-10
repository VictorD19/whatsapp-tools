'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AssistantForm, type AssistantFormData } from '@/components/assistants/assistant-form'
import { useTranslations } from 'next-intl'
import { apiPost } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { Assistant, ApiResponse } from '@/components/assistants/types'

export default function NewAssistantPage() {
  const t = useTranslations('assistants')
  React.useEffect(() => { document.title = 'Novo Assistente | SistemaZapChat' }, [])

  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(
    async (data: AssistantFormData) => {
      setSaving(true)
      try {
        const { knowledgeBaseIds, aiToolIds, ...body } = data
        const res = await apiPost<ApiResponse<Assistant>>('assistants', body)
        const newId = res.data.id

        for (const kbId of knowledgeBaseIds) {
          await apiPost(`assistants/${newId}/knowledge-bases`, { knowledgeBaseId: kbId })
        }
        for (const toolId of aiToolIds) {
          await apiPost(`assistants/${newId}/tools`, { aiToolId: toolId })
        }

        toast({ title: t('success.created'), variant: 'success' })
        router.push('/assistants')
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.creating')
        toast({ title: message, variant: 'destructive' })
      } finally {
        setSaving(false)
      }
    },
    [router],
  )

  return (
    <div className="h-full flex flex-col">
      <AssistantForm assistant={null} saving={saving} onSave={handleSave} />
    </div>
  )
}
