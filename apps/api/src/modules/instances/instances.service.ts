import { Injectable, HttpStatus } from '@nestjs/common'
import { InstancesRepository } from './instances.repository'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstancesGateway } from './instances.gateway'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { CreateInstanceDto } from './dto/create-instance.dto'
import { UpdateInstanceDto } from './dto/update-instance.dto'
import { PrismaService } from '@core/database/prisma.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class InstancesService {
  constructor(
    private readonly repository: InstancesRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly gateway: InstancesGateway,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) { }

  async create(tenantId: string, dto: CreateInstanceDto) {
    // Check for duplicate name within tenant
    const existing = await this.repository.findByName(tenantId, dto.name)
    if (existing) {
      throw new AppException(
        'INSTANCE_NAME_ALREADY_EXISTS',
        `Já existe uma instância com o nome "${dto.name}"`,
        { name: dto.name },
        HttpStatus.CONFLICT,
      )
    }

    // Check instance limit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, plan: { select: { maxInstances: true } } },
    })
    if (!tenant) {
      throw AppException.notFound('TENANT_NOT_FOUND', 'Tenant não encontrado')
    }

    const maxInstances = tenant.plan.maxInstances
    const count = await this.repository.countByTenant(tenantId)
    if (count >= maxInstances) {
      throw new AppException(
        'INSTANCE_LIMIT_REACHED',
        `Limite de ${maxInstances} instâncias atingido`,
        { current: count, max: maxInstances },
      )
    }

    // Create on Evolution API (webhook is set during creation)
    // WEBHOOK_URL overrides APP_URL — needed when Evolution runs in Docker
    // and cannot reach the host via localhost
    const webhookBase = this.config.get<string>('WEBHOOK_URL')
      || this.config.get<string>('APP_URL', 'http://localhost:8000')
    const evolutionId = `${tenantId}_${dto.name}`
    let evolutionResult: { instanceId: string; status: string }
    try {
      evolutionResult = await this.whatsapp.createInstance({
        name: dto.name,
        tenantId,
        webhookUrl: `${webhookBase}/api/v1/webhooks/evolution/${evolutionId}`,
      })
    } catch (error) {
      this.logger.error(
        `Failed to create instance on Evolution API: ${(error as Error).message}`,
        (error as Error).stack,
        'InstancesService',
      )
      throw new AppException(
        'INSTANCE_EVOLUTION_CREATE_FAILED',
        'Falha ao criar instância no provedor WhatsApp',
        { reason: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      )
    }

    // Save to database
    const instance = await this.repository.create({
      tenantId,
      name: dto.name,
      evolutionId: evolutionResult.instanceId,
    })

    this.logger.log(
      `Instance created: ${instance.id} (${instance.evolutionId})`,
      'InstancesService',
    )

    return instance
  }

  async findAll(tenantId: string) {
    const instances = await this.repository.findAllByTenant(tenantId)

    // Sync status with Evolution API for instances that may be out of date
    // (e.g. webhook was lost while server was down)
    await Promise.allSettled(
      instances.map(async (instance) => {
        try {
          const realStatus = await this.whatsapp.getInstanceStatus(instance.evolutionId)
          if (realStatus !== instance.status) {
            let phone: string | undefined
            if (realStatus === 'CONNECTED') {
              try {
                const info = await this.whatsapp.getInstanceInfo(instance.evolutionId)
                phone = info.phone
              } catch {
                // ignore
              }
            }
            await this.repository.updateStatus(instance.tenantId, instance.id, realStatus, phone)
            instance.status = realStatus
            if (phone) instance.phone = phone
            this.logger.log(
              `Instance ${instance.id} status synced: ${instance.status} -> ${realStatus}`,
              'InstancesService',
            )
          }
        } catch {
          // Evolution API unreachable — keep DB status as-is
        }
      }),
    )

    return instances
  }

  async findByEvolutionId(evolutionId: string) {
    return this.repository.findByEvolutionId(evolutionId)
  }

  async findOne(tenantId: string, id: string) {
    const instance = await this.repository.findById(tenantId, id)
    if (!instance) {
      throw AppException.notFound('INSTANCE_NOT_FOUND', 'Instância não encontrada', { id })
    }
    return instance
  }

  async update(tenantId: string, id: string, dto: UpdateInstanceDto) {
    const instance = await this.repository.findById(tenantId, id)
    if (!instance) {
      throw AppException.notFound('INSTANCE_NOT_FOUND', 'Instância não encontrada', { id })
    }

    if (dto.name && dto.name !== instance.name) {
      const existing = await this.repository.findByName(tenantId, dto.name)
      if (existing && existing.id !== id) {
        throw new AppException(
          'INSTANCE_NAME_ALREADY_EXISTS',
          `Já existe uma instância com o nome "${dto.name}"`,
          { name: dto.name },
          HttpStatus.CONFLICT,
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.defaultAssistantId !== undefined) updateData.defaultAssistantId = dto.defaultAssistantId
    if (dto.inactivityFlowRules !== undefined) updateData.inactivityFlowRules = dto.inactivityFlowRules

    return this.repository.update(tenantId, id, updateData)
  }

  async connect(tenantId: string, id: string) {
    const instance = await this.findOne(tenantId, id)

    if (instance.status === 'CONNECTED') {
      throw new AppException(
        'INSTANCE_ALREADY_CONNECTED',
        'Instância já está conectada',
        { id },
      )
    }

    let qrResult: { qrCode: string; pairingCode?: string }
    try {
      qrResult = await this.whatsapp.connectInstance(instance.evolutionId)
    } catch (error) {
      this.logger.error(
        `Failed to connect instance ${instance.evolutionId}: ${(error as Error).message}`,
        (error as Error).stack,
        'InstancesService',
      )
      throw new AppException(
        'INSTANCE_EVOLUTION_SYNC_FAILED',
        'Falha ao conectar instância no provedor WhatsApp',
        { reason: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      )
    }

    // Update status to CONNECTING
    await this.repository.updateStatus(tenantId, id, 'CONNECTING')

    // Emit QR code via WebSocket
    this.gateway.emitQrUpdated(tenantId, {
      instanceId: id,
      qrCode: qrResult.qrCode,
    })

    this.gateway.emitStatusChanged(tenantId, {
      instanceId: id,
      status: 'CONNECTING',
    })

    return {
      qrCode: qrResult.qrCode,
      pairingCode: qrResult.pairingCode,
    }
  }

  async disconnect(tenantId: string, id: string) {
    const instance = await this.findOne(tenantId, id)

    if (instance.status === 'DISCONNECTED') {
      throw new AppException(
        'INSTANCE_NOT_CONNECTED',
        'Instância não está conectada',
        { id },
      )
    }

    try {
      await this.whatsapp.disconnectInstance(instance.evolutionId)
    } catch (error) {
      this.logger.error(
        `Failed to disconnect instance ${instance.evolutionId}: ${(error as Error).message}`,
        (error as Error).stack,
        'InstancesService',
      )
      throw new AppException(
        'INSTANCE_EVOLUTION_SYNC_FAILED',
        'Falha ao desconectar instância no provedor WhatsApp',
        { reason: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      )
    }

    await this.repository.updateStatus(tenantId, id, 'DISCONNECTED')

    this.gateway.emitDisconnected(tenantId, { instanceId: id })
    this.gateway.emitStatusChanged(tenantId, { instanceId: id, status: 'DISCONNECTED' })

    this.logger.log(`Instance ${id} disconnected`, 'InstancesService')
  }

  async remove(tenantId: string, id: string) {
    const instance = await this.findOne(tenantId, id)

    // Delete from Evolution API first — must succeed before removing from DB
    try {
      await this.whatsapp.deleteInstance(instance.evolutionId)
    } catch (error) {
      this.logger.error(
        `Failed to delete instance from Evolution API (evolutionId=${instance.evolutionId}): ${(error as Error).message}`,
        'InstancesService',
      )
      throw new AppException(
        'INSTANCE_EVOLUTION_DELETE_FAILED',
        'Falha ao remover instância no provedor WhatsApp',
        { reason: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      )
    }

    // Soft delete in DB only after Evolution confirms deletion
    await this.repository.softDelete(tenantId, id)

    this.logger.log(`Instance ${id} deleted (soft)`, 'InstancesService')
  }
}
