import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { toast } from '@/components/ui/toaster'

interface BroadcastStartedPayload {
  broadcastId: string
  name: string
  total: number
}

interface BroadcastProgressPayload {
  broadcastId: string
  sent: number
  failed: number
  total: number
}

interface BroadcastCompletedPayload {
  broadcastId: string
  sent: number
  failed: number
  total: number
}

interface BroadcastFailedPayload {
  broadcastId: string
  reason: string
}

interface UseBroadcastSocketOptions {
  onProgress: (broadcastId: string, sent: number, failed: number) => void
  onStatusChange: (broadcastId: string, status: string) => void
}

export function useBroadcastSocket({ onProgress, onStatusChange }: UseBroadcastSocketOptions) {
  useEffect(() => {
    const socket = getSocket()

    function handleStarted(payload: BroadcastStartedPayload) {
      onStatusChange(payload.broadcastId, 'RUNNING')
      toast({
        title: 'Campanha iniciada',
        description: `"${payload.name}" - ${payload.total} destinatarios`,
      })
    }

    function handleProgress(payload: BroadcastProgressPayload) {
      onProgress(payload.broadcastId, payload.sent, payload.failed)
    }

    function handleCompleted(payload: BroadcastCompletedPayload) {
      onStatusChange(payload.broadcastId, 'COMPLETED')
      onProgress(payload.broadcastId, payload.sent, payload.failed)
      toast({
        title: 'Campanha concluida',
        description: `${payload.sent} enviadas, ${payload.failed} falhas`,
        variant: 'success',
      })
    }

    function handleFailed(payload: BroadcastFailedPayload) {
      onStatusChange(payload.broadcastId, 'FAILED')
      toast({
        title: 'Campanha falhou',
        description: payload.reason,
        variant: 'destructive',
      })
    }

    function handlePaused(payload: { broadcastId: string }) {
      onStatusChange(payload.broadcastId, 'PAUSED')
    }

    socket.on('broadcast:started', handleStarted)
    socket.on('broadcast:progress', handleProgress)
    socket.on('broadcast:completed', handleCompleted)
    socket.on('broadcast:failed', handleFailed)
    socket.on('broadcast:paused', handlePaused)

    return () => {
      socket.off('broadcast:started', handleStarted)
      socket.off('broadcast:progress', handleProgress)
      socket.off('broadcast:completed', handleCompleted)
      socket.off('broadcast:failed', handleFailed)
      socket.off('broadcast:paused', handlePaused)
    }
  }, [onProgress, onStatusChange])
}
