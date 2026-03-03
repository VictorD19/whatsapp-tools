import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { InstancesRepository } from '../instances.repository'
import { InstancesGateway } from '../instances.gateway'
import { InstanceWebhookJob } from './instance-webhook.producer'
import { InstanceStatus } from '@prisma/client'

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
      default: {
        this.logger.debug(
          `Unhandled webhook event: ${event}`,
          'InstanceWebhookProcessor',
        )
      }
    }
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
