import { useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { useInstancesStore, type Instance } from '@/stores/instances.store'
import { toast } from '@/components/ui/toaster'

interface ApiResponse<T> {
  data: T
  meta?: Record<string, unknown>
}

interface ConnectResult {
  qrCode: string
}

export function useInstances() {
  const { setInstances, setLoading, addInstance, removeInstance, updateInstanceStatus } =
    useInstancesStore()

  const fetchInstances = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<ApiResponse<Instance[]>>('instances')
      setInstances(res.data)
    } catch {
      toast({ title: 'Erro ao carregar instancias', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [setInstances, setLoading])

  const createInstance = useCallback(
    async (name: string) => {
      const res = await apiPost<ApiResponse<Instance>>('instances', { name })
      addInstance(res.data)
      toast({ title: 'Instancia criada', variant: 'success' })
      return res.data
    },
    [addInstance],
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
      toast({ title: 'Instancia desconectada', variant: 'success' })
    },
    [updateInstanceStatus],
  )

  const deleteInstance = useCallback(
    async (id: string) => {
      await apiDelete<void>(`instances/${id}`)
      removeInstance(id)
      toast({ title: 'Instancia excluida', variant: 'success' })
    },
    [removeInstance],
  )

  return { fetchInstances, createInstance, connectInstance, disconnectInstance, deleteInstance }
}
