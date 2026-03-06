import { useState, useCallback, useRef } from 'react'
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

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const hasFetched = useRef(false)
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  const fetchContacts = useCallback(async (search?: string, page = 1) => {
    setFetching(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '10')

      const res = await apiGet<PaginatedResponse>(`contacts?${params}`)
      setContacts(res.data)
      setMeta(res.meta)
    } catch {
      toast({ title: 'Erro ao carregar contatos', variant: 'destructive' })
    } finally {
      setFetching(false)
      if (!hasFetched.current) {
        hasFetched.current = true
        setInitialLoading(false)
      }
    }
  }, [])

  const createContact = useCallback(async (dto: ContactPayload) => {
    const res = await apiPost<{ data: Contact }>('contacts', dto)
    toast({ title: 'Contato criado com sucesso', variant: 'success' })
    return res.data
  }, [])

  const updateContact = useCallback(async (id: string, dto: Partial<ContactPayload>) => {
    const res = await apiPatch<{ data: Contact }>(`contacts/${id}`, dto)
    toast({ title: 'Contato atualizado com sucesso', variant: 'success' })
    return res.data
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    await apiDelete<{ data: { deleted: boolean } }>(`contacts/${id}`)
    toast({ title: 'Contato removido com sucesso', variant: 'success' })
  }, [])

  return {
    contacts,
    initialLoading,
    fetching,
    meta,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  }
}
