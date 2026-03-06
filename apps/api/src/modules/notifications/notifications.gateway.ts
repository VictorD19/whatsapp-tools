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
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly logger: LoggerService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId as string | undefined
    if (userId) {
      client.join(`user:${userId}`)
      this.logger.debug(`Client ${client.id} joined user:${userId}`, 'NotificationsGateway')
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected from notifications`, 'NotificationsGateway')
  }

  emitNotification(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('notification:new', payload)
  }

  emitUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification:unread_count', { count })
  }
}
