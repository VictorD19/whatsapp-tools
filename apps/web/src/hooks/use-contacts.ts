import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface Contact {
  id: string
  phone: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  contactTags?: { tag: { id: string; name: string; color: string } }[]
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaginatedResponse {
  data: Contact[]
  meta: PaginationMeta
}

interface ContactPayload {
  phone: string
  name?: string
}

const defaultMeta: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 }

export const CONTACTS_QUERY_KEY = ['contacts']

export function useContacts({ search, page = 1 }: { search?: string; page?: number } = {}) {
  const t = useTranslations('contacts')
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, { search, page }],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '10')
      return apiGet<PaginatedResponse>(`contacts?${params}`)
    },
    placeholderData: keepPreviousData,
  })

  const createContact = useCallback(
    async (dto: ContactPayload) => {
      const res = await apiPost<{ data: Contact }>('contacts', dto)
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY })
      toast({ title: t('success.created'), variant: 'success' })
      return res.data
    },
    [queryClient],
  )

  const updateContact = useCallback(
    async (id: string, dto: Partial<ContactPayload>) => {
      const res = await apiPatch<{ data: Contact }>(`contacts/${id}`, dto)
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY })
      toast({ title: t('success.updated'), variant: 'success' })
      return res.data
    },
    [queryClient],
  )

  const deleteContact = useCallback(
    async (id: string) => {
      await apiDelete<{ data: { deleted: boolean } }>(`contacts/${id}`)
      queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY })
      toast({ title: t('success.deleted'), variant: 'success' })
    },
    [queryClient],
  )

  return {
    contacts: data?.data ?? [],
    initialLoading: isLoading,
    fetching: isFetching,
    meta: data?.meta ?? defaultMeta,
    createContact,
    updateContact,
    deleteContact,
  }
}
