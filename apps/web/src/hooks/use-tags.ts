import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface Tag {
  id: string
  name: string
  color: string
  tenantId: string
}

interface ApiResponse<T> {
  data: T
}

export const TAGS_QUERY_KEY = ['tags']
export const contactTagsKey = (contactId: string) => ['contact-tags', contactId]

export function useTags() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<Tag[]>>('tags').then((r) => r.data),
  })

  const addTagToContact = useCallback(
    async (contactId: string, tagId: string) => {
      try {
        await apiPost<ApiResponse<unknown>>(`contacts/${contactId}/tags`, { tagId })
        queryClient.invalidateQueries({ queryKey: contactTagsKey(contactId) })
        return true
      } catch {
        toast({ title: 'Erro ao adicionar tag', variant: 'destructive' })
        return false
      }
    },
    [queryClient],
  )

  const removeTagFromContact = useCallback(
    async (contactId: string, tagId: string) => {
      try {
        await apiDelete<ApiResponse<unknown>>(`contacts/${contactId}/tags/${tagId}`)
        queryClient.invalidateQueries({ queryKey: contactTagsKey(contactId) })
        return true
      } catch {
        toast({ title: 'Erro ao remover tag', variant: 'destructive' })
        return false
      }
    },
    [queryClient],
  )

  return {
    tags: data ?? [],
    isLoading,
    addTagToContact,
    removeTagFromContact,
  }
}

export function useContactTags(contactId: string | undefined) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: contactId ? contactTagsKey(contactId) : [],
    queryFn: () =>
      apiGet<ApiResponse<Tag[]>>(`contacts/${contactId}/tags`).then((r) => r.data),
    enabled: !!contactId,
  })

  return {
    contactTags: data ?? [],
    isLoadingContactTags: isLoading,
    refetchContactTags: refetch,
  }
}
