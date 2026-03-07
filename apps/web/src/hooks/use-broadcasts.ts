import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiGet, apiDelete, apiUpload, apiUploadPut } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { USAGE_QUERY_KEY } from '@/components/layout/plan-usage'
import type { BroadcastVariation } from '@/components/broadcasts/step-message-content'

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
  variations?: Array<{
    id: string
    messageType: BroadcastMessageType
    text: string
    mediaUrl: string | null
    fileName: string | null
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
  variations: Array<BroadcastVariation & {
    existingMediaUrl?: string
    existingFileName?: string
  }>
  delay: number
  scheduledAt?: string
}

export function useBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const hasFetched = useRef(false)
  const queryClient = useQueryClient()
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

  const fetchBroadcast = useCallback(async (id: string) => {
    const res = await apiGet<{ data: Broadcast }>(`broadcasts/${id}`)
    return res.data
  }, [])

  const createBroadcast = useCallback(async (payload: CreateBroadcastPayload) => {
    try {
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('delay', String(payload.delay))

      for (const id of payload.instanceIds) {
        formData.append('instanceIds', id)
      }
      for (const id of payload.contactListIds) {
        formData.append('contactListIds', id)
      }
      if (payload.groups.length > 0) {
        formData.append('groups', JSON.stringify(payload.groups))
      }
      if (payload.scheduledAt) {
        formData.append('scheduledAt', payload.scheduledAt)
      }

      // Variations: send metadata as JSON, files separately indexed
      const variationsMeta = payload.variations.map((v) => ({
        messageType: v.messageType,
        text: v.text,
      }))
      formData.append('variations', JSON.stringify(variationsMeta))

      for (let i = 0; i < payload.variations.length; i++) {
        const v = payload.variations[i]
        if (v.file) {
          formData.append(`file-${i}`, v.file)
        }
      }

      const res = await apiUpload<{ data: Broadcast }>('broadcasts', formData)
      queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY })
      toast({ title: 'Campanha criada com sucesso', variant: 'success' })
      return res.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar campanha'
      toast({ title: message, variant: 'destructive' })
      throw err
    }
  }, [queryClient])

  const updateBroadcast = useCallback(async (id: string, payload: CreateBroadcastPayload) => {
    try {
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('delay', String(payload.delay))

      for (const iid of payload.instanceIds) {
        formData.append('instanceIds', iid)
      }
      for (const cid of payload.contactListIds) {
        formData.append('contactListIds', cid)
      }
      if (payload.groups.length > 0) {
        formData.append('groups', JSON.stringify(payload.groups))
      }
      if (payload.scheduledAt) {
        formData.append('scheduledAt', payload.scheduledAt)
      }

      const variationsMeta = payload.variations.map((v) => ({
        messageType: v.messageType,
        text: v.text,
        existingMediaUrl: v.existingMediaUrl,
        existingFileName: v.existingFileName,
      }))
      formData.append('variations', JSON.stringify(variationsMeta))

      for (let i = 0; i < payload.variations.length; i++) {
        const v = payload.variations[i]
        if (v.file) {
          formData.append(`file-${i}`, v.file)
        }
      }

      const res = await apiUploadPut<{ data: Broadcast }>(`broadcasts/${id}`, formData)
      toast({ title: 'Campanha atualizada com sucesso', variant: 'success' })
      return res.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar campanha'
      toast({ title: message, variant: 'destructive' })
      throw err
    }
  }, [])

  const pauseBroadcast = useCallback(async (id: string) => {
    const { apiPost } = await import('@/lib/api')
    await apiPost<{ data: Broadcast }>(`broadcasts/${id}/pause`, {})
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'PAUSED' as const } : b)),
    )
    toast({ title: 'Campanha pausada', variant: 'info' })
  }, [])

  const resumeBroadcast = useCallback(async (id: string) => {
    const { apiPost } = await import('@/lib/api')
    await apiPost<{ data: Broadcast }>(`broadcasts/${id}/resume`, {})
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'RUNNING' as const } : b)),
    )
    toast({ title: 'Campanha retomada', variant: 'info' })
  }, [])

  const cancelBroadcast = useCallback(async (id: string) => {
    const { apiPost } = await import('@/lib/api')
    await apiPost<{ data: Broadcast }>(`broadcasts/${id}/cancel`, {})
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' as const } : b)),
    )
    toast({ title: 'Campanha cancelada', variant: 'warning' })
  }, [])

  const deleteBroadcast = useCallback(async (id: string) => {
    await apiDelete(`broadcasts/${id}`)
    setBroadcasts((prev) => prev.filter((b) => b.id !== id))
    toast({ title: 'Campanha removida', variant: 'success' })
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
    fetchBroadcast,
    createBroadcast,
    updateBroadcast,
    pauseBroadcast,
    resumeBroadcast,
    cancelBroadcast,
    deleteBroadcast,
    updateBroadcastProgress,
    updateBroadcastStatus,
  }
}
