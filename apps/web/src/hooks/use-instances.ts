import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { useInstancesStore, type Instance } from '@/stores/instances.store'
import { USAGE_QUERY_KEY } from '@/components/layout/plan-usage'
import { toast } from '@/components/ui/toaster'

interface ApiResponse<T> {
  data: T
  meta?: Record<string, unknown>
}

interface ConnectResult {
  qrCode: string
}

// Safety timeout: if import:started is not received within 90s, clear stuck state.
// The backend findChats now has a 60s HTTP timeout, so 90s covers the full round-trip.
const IMPORT_START_TIMEOUT_MS = 90_000

export function useInstances() {
  const t = useTranslations('instances')
  const { setInstances, setLoading, addInstance, removeInstance, updateInstanceStatus, setImportProgress, clearImportProgress } =
    useInstancesStore()
  const queryClient = useQueryClient()

  const fetchInstances = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<ApiResponse<Instance[]>>('instances')
      setInstances(res.data)
    } catch {
      toast({ title: t('error.loading'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [setInstances, setLoading, t])

  // Silent refresh: syncs with Evolution API without triggering loading state
  // Used for background polling while instances are connecting
  const refreshInstances = useCallback(async () => {
    try {
      const res = await apiGet<ApiResponse<Instance[]>>('instances')
      setInstances(res.data)
    } catch {
      // Ignore polling errors silently
    }
  }, [setInstances])

  const createInstance = useCallback(
    async (name: string) => {
      const res = await apiPost<ApiResponse<Instance>>('instances', { name })
      addInstance(res.data)
      queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY })
      toast({ title: t('success.created'), variant: 'success' })
      return res.data
    },
    [addInstance, queryClient, t],
  )

  const connectInstance = useCallback(
    async (id: string) => {
      updateInstanceStatus(id, 'CONNECTING')
      const res = await apiPost<ApiResponse<ConnectResult>>(`instances/${id}/connect`, {})
      return res.data.qrCode
    },
    [updateInstanceStatus],
  )

  const disconnectInstance = useCallback(
    async (id: string) => {
      await apiPost<ApiResponse<void>>(`instances/${id}/disconnect`, {})
      updateInstanceStatus(id, 'DISCONNECTED')
      toast({ title: t('success.disconnected'), variant: 'success' })
    },
    [updateInstanceStatus, t],
  )

  const deleteInstance = useCallback(
    async (id: string) => {
      await apiDelete<void>(`instances/${id}`)
      removeInstance(id)
      toast({ title: t('success.deleted'), variant: 'success' })
    },
    [removeInstance, t],
  )

  const importConversations = useCallback(
    async (instanceId: string) => {
      setImportProgress(instanceId, { importing: true, imported: 0, total: 0, skipped: 0 })

      // Safety net: if import:started WebSocket event is not received within 90s,
      // the job likely failed silently or the socket missed the event. Clear stuck UI.
      const safetyTimer = setTimeout(() => {
        const current = useInstancesStore.getState().importProgress[instanceId]
        if (current?.importing && current.total === 0) {
          clearImportProgress(instanceId)
          toast({
            title: t('error.importTimeout'),
            description: t('error.importTimeoutDesc'),
            variant: 'destructive',
          })
        }
      }, IMPORT_START_TIMEOUT_MS)

      try {
        await apiPost<ApiResponse<{ message: string }>>(`inbox/instances/${instanceId}/import-conversations`, {})
        toast({ title: t('success.importStarted'), variant: 'success' })
      } catch {
        clearTimeout(safetyTimer)
        clearImportProgress(instanceId)
        toast({ title: t('error.importFailed'), variant: 'destructive' })
      }
    },
    [setImportProgress, clearImportProgress, t],
  )

  return { fetchInstances, refreshInstances, createInstance, connectInstance, disconnectInstance, deleteInstance, importConversations }
}
