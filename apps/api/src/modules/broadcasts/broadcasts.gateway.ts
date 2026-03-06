import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class BroadcastGateway {
  @WebSocketServer()
  server: Server

  emitBroadcastStarted(
    tenantId: string,
    payload: { broadcastId: string; name: string; total: number },
  ) {
    this.server.to(`tenant:${tenantId}`).emit('broadcast:started', payload)
  }

  emitBroadcastProgress(
    tenantId: string,
    payload: { broadcastId: string; sent: number; failed: number; total: number },
  ) {
    this.server.to(`tenant:${tenantId}`).emit('broadcast:progress', payload)
  }

  emitBroadcastCompleted(
    tenantId: string,
    payload: { broadcastId: string; sent: number; failed: number; total: number },
  ) {
    this.server.to(`tenant:${tenantId}`).emit('broadcast:completed', payload)
  }

  emitBroadcastFailed(
    tenantId: string,
    payload: { broadcastId: string; reason: string },
  ) {
    this.server.to(`tenant:${tenantId}`).emit('broadcast:failed', payload)
  }

  emitBroadcastPaused(tenantId: string, payload: { broadcastId: string }) {
    this.server.to(`tenant:${tenantId}`).emit('broadcast:paused', payload)
  }
}
