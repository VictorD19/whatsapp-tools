import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { InstancesRepository } from '../instances.repository'
import { InstancesGateway } from '../instances.gateway'
import { InstanceStatus } from '@prisma/client'

interface InstanceWebhookJob {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Processor(QUEUES.WEBHOOK_INBOUND)
export class InstanceWebhookProcessor {
  constructor(
    private readonly repository: InstancesRepository,
    private readonly gateway: InstancesGateway,
    private readonly logger: LoggerService,
  ) {}

  @Process('instance-webhook')
  async handleInstanceWebhook(job: Job<InstanceWebhookJob>) {
    const { instanceName, event, data } = job.data

    this.logger.debug(
      `Processing webhook: ${event} for ${instanceName}`,
      'InstanceWebhookProcessor',
    )

    const instance = await this.repository.findByEvolutionId(instanceName)
    if (!instance) {
      this.logger.warn(
        `Instance not found for evolutionId: ${instanceName}`,
        'InstanceWebhookProcessor',
      )
      return
    }

    switch (event) {
      case 'connection.update': {
        await this.handleConnectionUpdate(instance, data)
        break
      }
      case 'qrcode.updated': {
        this.handleQrCodeUpdated(instance, data)
        break
      }
      default: {
        this.logger.debug(
          `Unhandled webhook event: ${event}`,
          'InstanceWebhookProcessor',
        )
      }
    }
  }

  private handleQrCodeUpdated(
    instance: { id: string; tenantId: string },
    data: Record<string, unknown>,
  ) {
    // Evolution sends qrcode as object { base64: "data:image/png;base64,...", code: "..." }
    let qrCode: string | undefined

    if (data.qrcode && typeof data.qrcode === 'object') {
      const qrData = data.qrcode as Record<string, unknown>
      qrCode = qrData.base64 as string | undefined
    } else {
      qrCode = data.qrcode as string | undefined
    }

    if (!qrCode) return

    this.gateway.emitQrUpdated(instance.tenantId, {
      instanceId: instance.id,
      qrCode,
    })

    this.logger.debug(
      `QR code updated for instance ${instance.id}`,
      'InstanceWebhookProcessor',
    )
  }

  private async handleConnectionUpdate(
    instance: { id: string; tenantId: string },
    data: Record<string, unknown>,
  ) {
    const state = data.state as string | undefined
    const statusCode = data.statusReason as number | undefined

    let newStatus: InstanceStatus
    let phone: string | undefined

    if (state === 'open') {
      newStatus = 'CONNECTED'
      // Evolution may send phone number in the connection update
      if (data.instance && typeof data.instance === 'object') {
        const instanceData = data.instance as Record<string, unknown>
        phone = instanceData.wuid as string | undefined
        // wuid format: 5511999999999@s.whatsapp.net -> extract number
        if (phone?.includes('@')) {
          phone = phone.split('@')[0]
        }
      }
    } else if (state === 'close' && statusCode === 401) {
      newStatus = 'BANNED'
    } else if (state === 'close') {
      newStatus = 'DISCONNECTED'
    } else if (state === 'connecting') {
      newStatus = 'CONNECTING'
    } else {
      return
    }

    await this.repository.updateStatus(instance.tenantId, instance.id, newStatus, phone)

    // Emit WebSocket events based on new status
    switch (newStatus) {
      case 'CONNECTED':
        this.gateway.emitConnected(instance.tenantId, {
          instanceId: instance.id,
          phone: phone ?? '',
        })
        break
      case 'DISCONNECTED':
      case 'BANNED':
        this.gateway.emitDisconnected(instance.tenantId, {
          instanceId: instance.id,
        })
        break
    }

    this.gateway.emitStatusChanged(instance.tenantId, {
      instanceId: instance.id,
      status: newStatus,
    })

    this.logger.log(
      `Instance ${instance.id} status updated to ${newStatus}`,
      'InstanceWebhookProcessor',
    )
  }
}
