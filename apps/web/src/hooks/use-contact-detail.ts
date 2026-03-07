import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { Contact } from '@/hooks/use-contacts'
import type { Deal } from '@/hooks/use-deal'

interface ApiResponse<T> {
  data: T
}

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const contactKey = (id: string) => ['contact', id]
export const contactDealsKey = (id: string) => ['contact-deals', id]

export function useContactDetail(contactId: string) {
  const queryClient = useQueryClient()

  const { data: contact = null, isLoading: isLoadingContact } = useQuery({
    queryKey: contactKey(contactId),
    queryFn: () =>
      apiGet<ApiResponse<Contact>>(`contacts/${contactId}`).then((r) => r.data),
    enabled: !!contactId,
  })

  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: contactDealsKey(contactId),
    queryFn: () =>
      apiGet<PaginatedResponse<Deal>>(`deals?contactId=${contactId}&limit=50`).then(
        (r) => r.data,
      ),
    enabled: !!contactId,
  })

  const updateContact = useCallback(
    async (dto: { name?: string; phone?: string }) => {
      try {
        const res = await apiPatch<ApiResponse<Contact>>(`contacts/${contactId}`, dto)
        queryClient.invalidateQueries({ queryKey: contactKey(contactId) })
        queryClient.invalidateQueries({ queryKey: ['contacts'] })
        toast({ title: 'Contato atualizado', variant: 'success' })
        return res.data
      } catch {
        toast({ title: 'Erro ao atualizar contato', variant: 'destructive' })
        return null
      }
    },
    [contactId, queryClient],
  )

  return {
    contact,
    deals,
    isLoadingContact,
    isLoadingDeals,
    updateContact,
  }
}
