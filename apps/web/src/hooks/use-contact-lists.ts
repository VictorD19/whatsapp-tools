import { useState, useCallback, useRef } from 'react'
import { apiGet, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface ContactList {
  id: string
  name: string
  description: string | null
  source: 'GROUP_EXTRACT' | 'CSV_IMPORT' | 'MANUAL' | 'CRM_FILTER'
  contactCount: number
  createdAt: string
  updatedAt: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaginatedResponse {
  data: ContactList[]
  meta: PaginationMeta
}

export function useContactLists() {
  const [lists, setLists] = useState<ContactList[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const hasFetched = useRef(false)
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchLists = useCallback(async (search?: string, page = 1) => {
    setFetching(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await apiGet<PaginatedResponse>(`contact-lists?${params}`)
      setLists(res.data)
      setMeta(res.meta)
    } catch {
      toast({ title: 'Erro ao carregar listas', variant: 'destructive' })
    } finally {
      setFetching(false)
      if (!hasFetched.current) {
        hasFetched.current = true
        setInitialLoading(false)
      }
    }
  }, [])

  const deleteList = useCallback(async (id: string) => {
    await apiDelete<{ data: { deleted: boolean } }>(`contact-lists/${id}`)
    toast({ title: 'Lista removida com sucesso' })
  }, [])

  return {
    lists,
    initialLoading,
    fetching,
    meta,
    fetchLists,
    deleteList,
  }
}
