import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete, apiUpload } from '@/lib/api'
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

const defaultMeta: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 }

export const CONTACT_LISTS_QUERY_KEY = ['contact-lists']

export function useContactLists({
  search,
  page = 1,
}: { search?: string; page?: number } = {}) {
  const t = useTranslations('contactLists')
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...CONTACT_LISTS_QUERY_KEY, { search, page }],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '20')
      return apiGet<PaginatedResponse>(`contact-lists?${params}`)
    },
    placeholderData: keepPreviousData,
  })

  const createList = useCallback(
    async (
      name: string,
      contactIds: string[],
      description?: string,
      phones?: string[],
    ) => {
      const res = await apiPost<{ data: ContactList }>('contact-lists', {
        name,
        description,
        ...(contactIds.length > 0 ? { contactIds } : { phones }),
      })
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_QUERY_KEY })
      toast({ title: t('success.created'), variant: 'success' })
      return res.data
    },
    [queryClient],
  )

  const importCsv = useCallback(
    async (name: string, file: File, description?: string) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', name)
      if (description) formData.append('description', description)

      const res = await apiUpload<{ data: ContactList }>(
        'contact-lists/import-csv',
        formData,
      )
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_QUERY_KEY })
      return res.data
    },
    [queryClient],
  )

  const deleteList = useCallback(
    async (id: string) => {
      await apiDelete<{ data: { deleted: boolean } }>(`contact-lists/${id}`)
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_QUERY_KEY })
      toast({ title: t('success.deleted'), variant: 'success' })
    },
    [queryClient],
  )

  return {
    lists: data?.data ?? [],
    initialLoading: isLoading,
    fetching: isFetching,
    meta: data?.meta ?? defaultMeta,
    createList,
    importCsv,
    deleteList,
  }
}
