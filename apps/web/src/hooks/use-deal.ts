import { useCallback, useState } from 'react'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface DealNote {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
  }
}

interface ApiResponse<T> {
  data: T
}

export function useDeal() {
  const [notes, setNotes] = useState<DealNote[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

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

  const moveDeal = useCallback(async (dealId: string, stageId: string, lostReason?: string) => {
    try {
      const payload: Record<string, string> = { stageId }
      if (lostReason) payload.lostReason = lostReason
      await apiPatch<ApiResponse<unknown>>(`deals/${dealId}/move`, payload)
      return true
    } catch {
      toast({ title: 'Erro ao mover deal', variant: 'destructive' })
      return false
    }
  }, [])

  const updateDealValue = useCallback(async (dealId: string, value: number | null) => {
    try {
      await apiPatch<ApiResponse<unknown>>(`deals/${dealId}`, { value })
      return true
    } catch {
      toast({ title: 'Erro ao atualizar valor', variant: 'destructive' })
      return false
    }
  }, [])

  return { notes, isLoadingNotes, fetchNotes, addNote, moveDeal, updateDealValue }
}
