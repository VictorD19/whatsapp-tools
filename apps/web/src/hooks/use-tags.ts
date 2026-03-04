import { useCallback, useEffect, useState } from 'react'
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

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiGet<ApiResponse<Tag[]>>('tags')
      setTags(res.data)
    } catch {
      toast({ title: 'Erro ao carregar tags', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const addTagToContact = useCallback(async (contactId: string, tagId: string) => {
    try {
      await apiPost<ApiResponse<unknown>>(`contacts/${contactId}/tags`, { tagId })
      return true
    } catch {
      toast({ title: 'Erro ao adicionar tag', variant: 'destructive' })
      return false
    }
  }, [])

  const removeTagFromContact = useCallback(async (contactId: string, tagId: string) => {
    try {
      await apiDelete<ApiResponse<unknown>>(`contacts/${contactId}/tags/${tagId}`)
      return true
    } catch {
      toast({ title: 'Erro ao remover tag', variant: 'destructive' })
      return false
    }
  }, [])

  return { tags, isLoading, fetchTags, addTagToContact, removeTagFromContact }
}
