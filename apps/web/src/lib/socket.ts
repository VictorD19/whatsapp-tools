import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket) return socket

  const { token, user } = useAuthStore.getState()

  socket = io(WS_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {
      token: token ? `Bearer ${token}` : '',
      tenantId: user?.tenantId ?? '',
    },
  })

  socket.connect()

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
