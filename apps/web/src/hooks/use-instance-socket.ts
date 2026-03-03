import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useInstancesStore } from '@/stores/instances.store'
import { toast } from '@/components/ui/toaster'

interface QrPayload {
  instanceId: string
  qrCode: string
}

interface ConnectedPayload {
  instanceId: string
  phone: string
}

interface DisconnectedPayload {
  instanceId: string
}

interface StatusPayload {
  instanceId: string
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'BANNED'
}

export function useInstanceSocket(onQrUpdated?: (payload: QrPayload) => void) {
  const updateInstanceStatus = useInstancesStore((s) => s.updateInstanceStatus)

  useEffect(() => {
    const socket = getSocket()

    function handleQrUpdated(payload: QrPayload) {
      onQrUpdated?.(payload)
    }

    function handleConnected(payload: ConnectedPayload) {
      updateInstanceStatus(payload.instanceId, 'CONNECTED', payload.phone)
      toast({ title: 'Instancia conectada', variant: 'success' })
    }

    function handleDisconnected(payload: DisconnectedPayload) {
      updateInstanceStatus(payload.instanceId, 'DISCONNECTED')
      toast({ title: 'Instancia desconectada', variant: 'destructive' })
    }

    function handleStatusChanged(payload: StatusPayload) {
      updateInstanceStatus(payload.instanceId, payload.status)
    }

    socket.on('instance:qr_updated', handleQrUpdated)
    socket.on('instance:connected', handleConnected)
    socket.on('instance:disconnected', handleDisconnected)
    socket.on('instance:status_changed', handleStatusChanged)

    return () => {
      socket.off('instance:qr_updated', handleQrUpdated)
      socket.off('instance:connected', handleConnected)
      socket.off('instance:disconnected', handleDisconnected)
      socket.off('instance:status_changed', handleStatusChanged)
    }
  }, [updateInstanceStatus, onQrUpdated])
}
