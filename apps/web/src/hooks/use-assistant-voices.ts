import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiGet, apiDelete, apiUpload, getApiErrorCode } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface CustomVoice {
  id: string
  name: string
  provider: string
  createdAt: string
}

interface ApiResponse<T> {
  data: T
}

export const ASSISTANT_VOICES_QUERY_KEY = ['assistant-voices']

export function useAssistantVoices() {
  const queryClient = useQueryClient()
  const t = useTranslations('assistantVoices')

  const { data, isLoading } = useQuery({
    queryKey: ASSISTANT_VOICES_QUERY_KEY,
    queryFn: () =>
      apiGet<ApiResponse<CustomVoice[]>>('assistants/voices').then((r) => r.data),
  })

  const createVoice = useCallback(
    async (name: string, file: File): Promise<boolean> => {
      try {
        const form = new FormData()
        form.append('name', name)
        form.append('file', file)
        await apiUpload<ApiResponse<CustomVoice>>('assistants/voices', form)
        await queryClient.invalidateQueries({ queryKey: ASSISTANT_VOICES_QUERY_KEY })
        toast({ title: t('success.created') })
        return true
      } catch (err) {
        const code = getApiErrorCode(err)
        const message =
          code === 'AI_VOICE_LIMIT_REACHED'
            ? t('error.limitReached')
            : code === 'AI_ELEVENLABS_NOT_CONFIGURED'
              ? t('notConfigured')
              : t('error.creating')
        toast({ title: message, variant: 'destructive' })
        return false
      }
    },
    [queryClient, t],
  )

  const deleteVoice = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiDelete<ApiResponse<unknown>>(`assistants/voices/${id}`)
        await queryClient.invalidateQueries({ queryKey: ASSISTANT_VOICES_QUERY_KEY })
        toast({ title: t('success.deleted') })
        return true
      } catch {
        toast({ title: t('error.deleting'), variant: 'destructive' })
        return false
      }
    },
    [queryClient, t],
  )

  return {
    voices: data ?? [],
    isLoading,
    createVoice,
    deleteVoice,
  }
}
