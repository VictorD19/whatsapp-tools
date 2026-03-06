import { useState, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export type BroadcastStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type BroadcastMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'

export interface Broadcast {
  id: string
  name: string
  status: BroadcastStatus
  messageType: BroadcastMessageType
  messageTexts: string[]
  mediaUrl: string | null
  caption: string | null
  fileName: string | null
  delay: number
  totalCount: number
  sentCount: number
  failedCount: number
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  instances: Array<{
    instance: { id: string; name: string; status: string }
  }>
  createdBy: { id: string; name: string }
  _count: { recipients: number }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaginatedResponse {
  data: Broadcast[]
  meta: PaginationMeta
}

interface CreateBroadcastPayload {
  name: string
  instanceIds: string[]
  contactListIds: string[]
  groups: Array<{ jid: string; name?: string }>
  messageType: BroadcastMessageType
  messageTexts: string[]
  mediaUrl?: string
  caption?: string
  fileName?: string
  delay: number
  scheduledAt?: string
}

export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const hasFetched = useRef(false)
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchBroadcasts = useCallback(
    async (search?: string, page = 1, status?: BroadcastStatus) => {
      setFetching(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (status) params.set('status', status)
        params.set('page', String(page))
        params.set('limit', '20')

        const res = await apiGet<PaginatedResponse>(`broadcasts?${params}`)
        setBroadcasts(res.data)
        setMeta(res.meta)
      } catch {
        toast({ title: 'Erro ao carregar campanhas', variant: 'destructive' })
      } finally {
        setFetching(false)
        if (!hasFetched.current) {
          hasFetched.current = true
          setInitialLoading(false)
        }
      }
    },
    [],
  )

  const createBroadcast = useCallback(async (payload: CreateBroadcastPayload) => {
    try {
      const res = await apiPost<{ data: Broadcast }>('broadcasts', payload)
      toast({ title: 'Campanha criada com sucesso' })
      return res.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar campanha'
      toast({ title: message, variant: 'destructive' })
      throw err
    }
  }, [])

  const pauseBroadcast = useCallback(async (id: string) => {
    await apiPost<{ data: Broadcast }>(`broadcasts/${id}/pause`, {})
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'PAUSED' as const } : b)),
    )
    toast({ title: 'Campanha pausada' })
  }, [])

  const resumeBroadcast = useCallback(async (id: string) => {
    await apiPost<{ data: Broadcast }>(`broadcasts/${id}/resume`, {})
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'RUNNING' as const } : b)),
    )
    toast({ title: 'Campanha retomada' })
  }, [])

  const cancelBroadcast = useCallback(async (id: string) => {
    await apiPost<{ data: Broadcast }>(`broadcasts/${id}/cancel`, {})
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' as const } : b)),
    )
    toast({ title: 'Campanha cancelada' })
  }, [])

  const deleteBroadcast = useCallback(async (id: string) => {
    await apiDelete(`broadcasts/${id}`)
    setBroadcasts((prev) => prev.filter((b) => b.id !== id))
    toast({ title: 'Campanha removida' })
  }, [])

  const updateBroadcastProgress = useCallback(
    (broadcastId: string, sent: number, failed: number) => {
      setBroadcasts((prev) =>
        prev.map((b) =>
          b.id === broadcastId ? { ...b, sentCount: sent, failedCount: failed } : b,
        ),
      )
    },
    [],
  )

  const updateBroadcastStatus = useCallback(
    (broadcastId: string, status: BroadcastStatus) => {
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === broadcastId ? { ...b, status } : b)),
      )
    },
    [],
  )

  return {
    broadcasts,
    initialLoading,
    fetching,
    meta,
    fetchBroadcasts,
    createBroadcast,
    pauseBroadcast,
    resumeBroadcast,
    cancelBroadcast,
    deleteBroadcast,
    updateBroadcastProgress,
    updateBroadcastStatus,
  }
}
