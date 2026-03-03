import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { LoggerService } from '@core/logger/logger.service'

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly logger: LoggerService) {}

  handleConnection(client: Socket) {
    const tenantId = client.handshake.auth?.tenantId as string | undefined
    if (tenantId) {
      client.join(`tenant:${tenantId}`)
      this.logger.debug(`Client ${client.id} joined tenant:${tenantId}`, 'InboxGateway')
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`, 'InboxGateway')
  }

  emitConversationCreated(tenantId: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('conversation:created', payload)
  }

  emitNewMessage(tenantId: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('conversation:new_message', payload)
  }

  emitConversationAssigned(tenantId: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('conversation:assigned', payload)
  }

  emitConversationClosed(tenantId: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('conversation:closed', payload)
  }

  emitConversationTransferred(tenantId: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('conversation:transferred', payload)
  }

  emitMessageStatusUpdated(tenantId: string, payload: Record<string, unknown>) {
    this.server.to(`tenant:${tenantId}`).emit('message:status_updated', payload)
  }
}
