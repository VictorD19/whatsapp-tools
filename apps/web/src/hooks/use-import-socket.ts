import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useInstancesStore } from '@/stores/instances.store'
import { toast } from '@/components/ui/toaster'

interface ImportStartedPayload {
  instanceId: string
  totalChats: number
  jobId: string
}

interface ImportProgressPayload {
  instanceId: string
  imported: number
  total: number
  skipped: number
}

interface ImportCompletedPayload {
  instanceId: string
  totalImported: number
  totalSkipped: number
  totalErrors: number
}

interface ImportFailedPayload {
  instanceId: string
  reason: string
}

export function useImportSocket() {
  const setImportProgress = useInstancesStore((s) => s.setImportProgress)
  const clearImportProgress = useInstancesStore((s) => s.clearImportProgress)

  useEffect(() => {
    const socket = getSocket()

    function handleStarted(payload: ImportStartedPayload) {
      setImportProgress(payload.instanceId, {
        importing: true,
        imported: 0,
        total: payload.totalChats,
        skipped: 0,
      })
    }

    function handleProgress(payload: ImportProgressPayload) {
      setImportProgress(payload.instanceId, {
        importing: true,
        imported: payload.imported,
        total: payload.total,
        skipped: payload.skipped,
      })
    }

    function handleCompleted(payload: ImportCompletedPayload) {
      clearImportProgress(payload.instanceId)
      toast({
        title: 'Importacao concluida',
        description: `${payload.totalImported} conversas importadas, ${payload.totalSkipped} ignoradas`,
        variant: 'success',
      })
    }

    function handleFailed(payload: ImportFailedPayload) {
      clearImportProgress(payload.instanceId)
      toast({
        title: 'Falha na importacao',
        description: payload.reason,
        variant: 'destructive',
      })
    }

    socket.on('import:started', handleStarted)
    socket.on('import:progress', handleProgress)
    socket.on('import:completed', handleCompleted)
    socket.on('import:failed', handleFailed)

    return () => {
      socket.off('import:started', handleStarted)
      socket.off('import:progress', handleProgress)
      socket.off('import:completed', handleCompleted)
      socket.off('import:failed', handleFailed)
    }
  }, [setImportProgress, clearImportProgress])
}
