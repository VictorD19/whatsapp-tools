import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { InstancesRepository } from '../instances.repository'
import { InstancesGateway } from '../instances.gateway'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstanceStatus } from '@prisma/client'
import { PrismaService } from '@core/database/prisma.service'
import { NotificationsService } from '@modules/notifications/notifications.service'

interface InstanceWebhookJob {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Processor(QUEUES.WEBHOOK_INSTANCE)
export class InstanceWebhookProcessor {
  constructor(
    private readonly repository: InstancesRepository,
    private readonly gateway: InstancesGateway,
    private readonly whatsapp: WhatsAppService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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
    instance: { id: string; tenantId: string; evolutionId: string },
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
    instance: { id: string; name?: string; tenantId: string; evolutionId: string },
    data: Record<string, unknown>,
  ) {
    const state = data.state as string | undefined
    const statusCode = data.statusReason as number | undefined

    let newStatus: InstanceStatus
    let phone: string | undefined

    if (state === 'open') {
      newStatus = 'CONNECTED'
      // Fetch phone number from Evolution API (webhook doesn't include it)
      try {
        const info = await this.whatsapp.getInstanceInfo(instance.evolutionId)
        phone = info.phone
      } catch (error) {
        this.logger.warn(
          `Failed to fetch phone for ${instance.evolutionId}: ${(error as Error).message}`,
          'InstanceWebhookProcessor',
        )
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

    // Dispatch notifications to all tenant admins
    if (newStatus === 'CONNECTED' || newStatus === 'DISCONNECTED' || newStatus === 'BANNED') {
      const instanceName = instance.name ?? instance.evolutionId
      let notifTitle: string
      let notifBody: string

      if (newStatus === 'CONNECTED') {
        notifTitle = 'Instância conectada'
        notifBody = `${instanceName} foi conectada com sucesso`
      } else if (newStatus === 'BANNED') {
        notifTitle = 'Instância banida'
        notifBody = `${instanceName} foi banida pelo WhatsApp`
      } else {
        notifTitle = 'Instância desconectada'
        notifBody = `${instanceName} foi desconectada`
      }

      try {
        const admins = await this.prisma.user.findMany({
          where: { tenantId: instance.tenantId, role: 'admin', deletedAt: null },
          select: { id: true },
        })

        for (const admin of admins) {
          void this.notifications.dispatch({
            tenantId: instance.tenantId,
            userId: admin.id,
            type: newStatus === 'CONNECTED'
              ? 'INSTANCE_CONNECTED'
              : newStatus === 'BANNED'
                ? 'INSTANCE_BANNED'
                : 'INSTANCE_DISCONNECTED',
            title: notifTitle,
            body: notifBody,
            data: { instanceId: instance.id },
          })
        }
      } catch (error) {
        this.logger.warn(
          `Failed to dispatch instance notifications: ${(error as Error).message}`,
          'InstanceWebhookProcessor',
        )
      }
    }

    this.logger.log(
      `Instance ${instance.id} status updated to ${newStatus}`,
      'InstanceWebhookProcessor',
    )
  }
}
