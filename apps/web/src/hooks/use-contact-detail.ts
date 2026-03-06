import { useCallback, useState } from 'react'
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

export function useContactDetail(contactId: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoadingContact, setIsLoadingContact] = useState(false)
  const [isLoadingDeals, setIsLoadingDeals] = useState(false)

  const fetchContact = useCallback(async () => {
    setIsLoadingContact(true)
    try {
      const res = await apiGet<ApiResponse<Contact>>(`contacts/${contactId}`)
      setContact(res.data)
      return res.data
    } catch {
      toast({ title: 'Erro ao carregar contato', variant: 'destructive' })
      return null
    } finally {
      setIsLoadingContact(false)
    }
  }, [contactId])

  const fetchContactDeals = useCallback(async () => {
    setIsLoadingDeals(true)
    try {
      const res = await apiGet<PaginatedResponse<Deal>>(`deals?contactId=${contactId}&limit=50`)
      setDeals(res.data)
      return res.data
    } catch {
      toast({ title: 'Erro ao carregar negócios', variant: 'destructive' })
      return []
    } finally {
      setIsLoadingDeals(false)
    }
  }, [contactId])

  const updateContact = useCallback(async (dto: { name?: string; phone?: string }) => {
    try {
      const res = await apiPatch<ApiResponse<Contact>>(`contacts/${contactId}`, dto)
      setContact(res.data)
      toast({ title: 'Contato atualizado', variant: 'success' })
      return res.data
    } catch {
      toast({ title: 'Erro ao atualizar contato', variant: 'destructive' })
      return null
    }
  }, [contactId])

  return {
    contact,
    deals,
    isLoadingContact,
    isLoadingDeals,
    fetchContact,
    fetchContactDeals,
    updateContact,
  }
}
