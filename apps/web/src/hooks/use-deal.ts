import { useCallback, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface DealContact {
  id: string
  phone: string
  name: string | null
  avatarUrl: string | null
}

export interface DealStage {
  id: string
  name: string
  color: string
  type: 'ACTIVE' | 'WON' | 'LOST'
  order: number
}

export interface DealPipeline {
  id: string
  name: string
}

export interface DealAssignee {
  id: string
  name: string
}

export interface Deal {
  id: string
  tenantId: string
  pipelineId: string
  stageId: string
  contactId: string
  conversationId: string | null
  assignedToId: string | null
  title: string | null
  value: number | null
  wonAt: string | null
  lostAt: string | null
  lostReason: string | null
  createdAt: string
  updatedAt: string
  contact: DealContact
  stage: DealStage
  pipeline: DealPipeline
  assignedTo: DealAssignee | null
}

export interface DealNote {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
  }
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

interface ApiResponse<T> {
  data: T
}

export interface CreateDealDto {
  contactId: string
  pipelineId?: string
  stageId?: string
  title?: string
  value?: number
  conversationId?: string
}

export interface UpdateDealDto {
  title?: string
  value?: number
  assignedToId?: string | null
}

export function useDeal() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoadingDeals, setIsLoadingDeals] = useState(false)
  const [notes, setNotes] = useState<DealNote[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

  const fetchDeals = useCallback(async (filters?: { pipelineId?: string; assignedToId?: string; contactId?: string }) => {
    setIsLoadingDeals(true)
    try {
      const params = new URLSearchParams()
      if (filters?.pipelineId) params.set('pipelineId', filters.pipelineId)
      if (filters?.assignedToId) params.set('assignedToId', filters.assignedToId)
      if (filters?.contactId) params.set('contactId', filters.contactId)
      params.set('limit', '100')

      const res = await apiGet<PaginatedResponse<Deal>>(`deals?${params}`)
      setDeals(res.data)
      return res.data
    } catch {
      toast({ title: 'Erro ao carregar negócios', variant: 'destructive' })
      return []
    } finally {
      setIsLoadingDeals(false)
    }
  }, [])

  const fetchDealById = useCallback(async (id: string) => {
    try {
      const res = await apiGet<ApiResponse<Deal>>(`deals/${id}`)
      return res.data
    } catch {
      toast({ title: 'Erro ao carregar negócio', variant: 'destructive' })
      return null
    }
  }, [])

  const createDeal = useCallback(async (dto: CreateDealDto) => {
    try {
      const res = await apiPost<ApiResponse<Deal>>('deals', dto)
      setDeals((prev) => [res.data, ...prev])
      toast({ title: 'Negócio criado com sucesso', variant: 'success' })
      return res.data
    } catch (err) {
      toast({ title: (err as Error).message || 'Erro ao criar negócio', variant: 'destructive' })
      return null
    }
  }, [])

  const updateDeal = useCallback(async (id: string, dto: UpdateDealDto) => {
    try {
      const res = await apiPatch<ApiResponse<Deal>>(`deals/${id}`, dto)
      setDeals((prev) => prev.map((d) => (d.id === id ? res.data : d)))
      return res.data
    } catch {
      toast({ title: 'Erro ao atualizar negócio', variant: 'destructive' })
      return null
    }
  }, [])

  const deleteDeal = useCallback(async (id: string) => {
    try {
      await apiDelete<ApiResponse<{ message: string }>>(`deals/${id}`)
      setDeals((prev) => prev.filter((d) => d.id !== id))
      toast({ title: 'Negócio removido com sucesso', variant: 'success' })
      return true
    } catch {
      toast({ title: 'Erro ao remover negócio', variant: 'destructive' })
      return false
    }
  }, [])

  const moveDeal = useCallback(async (dealId: string, stageId: string, lostReason?: string) => {
    try {
      const payload: Record<string, string> = { stageId }
      if (lostReason) payload.lostReason = lostReason
      const res = await apiPatch<ApiResponse<Deal>>(`deals/${dealId}/move`, payload)
      setDeals((prev) => prev.map((d) => (d.id === dealId ? res.data : d)))
      return res.data
    } catch {
      toast({ title: 'Erro ao mover negócio', variant: 'destructive' })
      return null
    }
  }, [])

  const fetchNotes = useCallback(async (dealId: string) => {
    setIsLoadingNotes(true)
    try {
      const res = await apiGet<ApiResponse<DealNote[]>>(`deals/${dealId}/notes`)
      setNotes(res.data)
    } catch {
      toast({ title: 'Erro ao carregar notas', variant: 'destructive' })
    } finally {
      setIsLoadingNotes(false)
    }
  }, [])

  const addNote = useCallback(async (dealId: string, content: string) => {
    try {
      const res = await apiPost<ApiResponse<DealNote>>(`deals/${dealId}/notes`, { content })
      setNotes((prev) => [res.data, ...prev])
      return true
    } catch {
      toast({ title: 'Erro ao adicionar nota', variant: 'destructive' })
      return false
    }
  }, [])

  return {
    deals,
    setDeals,
    isLoadingDeals,
    fetchDeals,
    fetchDealById,
    createDeal,
    updateDeal,
    deleteDeal,
    moveDeal,
    notes,
    isLoadingNotes,
    fetchNotes,
    addNote,
  }
}
