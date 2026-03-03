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
export class InstancesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly logger: LoggerService) {}

  handleConnection(client: Socket) {
    const tenantId = client.handshake.auth?.tenantId as string | undefined
    if (tenantId) {
      client.join(`tenant:${tenantId}`)
      this.logger.debug(`Client ${client.id} joined tenant:${tenantId}`, 'InstancesGateway')
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`, 'InstancesGateway')
  }

  emitQrUpdated(tenantId: string, payload: { instanceId: string; qrCode: string }) {
    this.server.to(`tenant:${tenantId}`).emit('instance:qr_updated', payload)
  }

  emitConnected(tenantId: string, payload: { instanceId: string; phone: string }) {
    this.server.to(`tenant:${tenantId}`).emit('instance:connected', payload)
  }

  emitDisconnected(tenantId: string, payload: { instanceId: string }) {
    this.server.to(`tenant:${tenantId}`).emit('instance:disconnected', payload)
  }

  emitStatusChanged(tenantId: string, payload: { instanceId: string; status: string }) {
    this.server.to(`tenant:${tenantId}`).emit('instance:status_changed', payload)
  }
}
