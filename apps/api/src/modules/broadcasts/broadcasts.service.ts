import { Injectable } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { BroadcastsRepository } from './broadcasts.repository'
import { BroadcastProducer } from './queues/broadcast.producer'
import type { CreateBroadcastDto } from './dto/create-broadcast.dto'
import type { ListBroadcastsDto } from './dto/list-broadcasts.dto'

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly repository: BroadcastsRepository,
    private readonly producer: BroadcastProducer,
    private readonly logger: LoggerService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateBroadcastDto) {
    // 1. Validate plan limits
    const plan = await this.repository.getTenantPlan(tenantId)
    if (plan) {
      const todayCount = await this.repository.countTodayBroadcasts(tenantId)
      if (todayCount >= plan.maxBroadcastsPerDay) {
        throw new AppException(
          'BROADCAST_DAILY_LIMIT',
          `Limite diário de ${plan.maxBroadcastsPerDay} campanhas atingido`,
        )
      }
    }

    // 2. Validate instances
    const instances = await this.repository.findInstancesByIds(tenantId, dto.instanceIds)
    if (instances.length === 0) {
      throw AppException.notFound('INSTANCE_NOT_FOUND', 'Nenhuma instância encontrada')
    }

    const connectedInstances = instances.filter((i) => i.status === 'CONNECTED')
    if (connectedInstances.length === 0) {
      throw new AppException(
        'BROADCAST_NO_CONNECTED_INSTANCE',
        'Nenhuma instância conectada. Conecte pelo menos uma instância antes de criar a campanha.',
      )
    }

    // 3. Resolve recipients from contact lists
    const contactListRecipients = await this.repository.resolveContactListRecipients(
      tenantId,
      dto.contactListIds,
    )

    // 4. Merge and deduplicate recipients by phone
    const recipientMap = new Map<string, { contactId: string; phone: string; name?: string | null }>()
    for (const r of contactListRecipients) {
      if (!recipientMap.has(r.phone)) {
        recipientMap.set(r.phone, r)
      }
    }

    const recipients = Array.from(recipientMap.values())

    if (recipients.length === 0 && dto.groups.length === 0) {
      throw new AppException('BROADCAST_EMPTY_LIST', 'Nenhum destinatário selecionado')
    }

    // 5. Validate contact limit
    if (plan && recipients.length > plan.maxContactsPerBroadcast) {
      throw new AppException(
        'BROADCAST_CONTACT_LIMIT',
        `Limite de ${plan.maxContactsPerBroadcast} contatos por campanha excedido (${recipients.length} selecionados)`,
      )
    }

    // 6. Build sources
    const sources: Array<{
      sourceType: 'CONTACT_LIST' | 'GROUP'
      contactListId?: string
      groupJid?: string
      groupName?: string
    }> = [
      ...dto.contactListIds.map((id) => ({
        sourceType: 'CONTACT_LIST' as const,
        contactListId: id,
      })),
      ...dto.groups.map((g) => ({
        sourceType: 'GROUP' as const,
        groupJid: g.jid,
        groupName: g.name,
      })),
    ]

    // 7. Determine status and calculate delay using tenant timezone
    const isScheduled = !!dto.scheduledAt
    const status = isScheduled ? ('SCHEDULED' as const) : ('RUNNING' as const)

    // 8. Create broadcast
    const broadcast = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
      name: dto.name,
      status,
      messageType: dto.messageType,
      messageTexts: dto.messageTexts,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      fileName: dto.fileName,
      delay: dto.delay,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      instanceIds: dto.instanceIds,
      sources,
      recipients,
    })

    // 9. Enqueue job — if scheduled, calculate delay respecting tenant timezone
    let delayMs: number | undefined
    if (isScheduled && dto.scheduledAt) {
      delayMs = this.calculateDelayMs(dto.scheduledAt, tenantId)
    }
    await this.producer.enqueue(broadcast.id, tenantId, delayMs)

    this.logger.log(
      `Broadcast ${broadcast.id} created: ${recipients.length} recipients, status=${status}${isScheduled ? `, scheduled for ${dto.scheduledAt}` : ''}`,
      'BroadcastsService',
    )

    return { data: broadcast }
  }

  async list(tenantId: string, filters: ListBroadcastsDto) {
    const { broadcasts, total } = await this.repository.findMany(tenantId, filters)

    return {
      data: broadcasts,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    }
  }

  async findOne(tenantId: string, id: string) {
    const broadcast = await this.repository.findById(tenantId, id)
    if (!broadcast) {
      throw AppException.notFound('BROADCAST_NOT_FOUND', 'Campanha não encontrada')
    }

    const stats = await this.repository.getRecipientStats(id)

    return { data: { ...broadcast, recipientStats: stats } }
  }

  async pause(tenantId: string, id: string) {
    const broadcast = await this.repository.findById(tenantId, id)
    if (!broadcast) {
      throw AppException.notFound('BROADCAST_NOT_FOUND', 'Campanha não encontrada')
    }
    if (broadcast.status !== 'RUNNING') {
      throw new AppException(
        'BROADCAST_CANNOT_PAUSE',
        'Apenas campanhas em andamento podem ser pausadas',
      )
    }

    const updated = await this.repository.updateStatus(id, 'PAUSED')
    return { data: updated }
  }

  async resume(tenantId: string, id: string) {
    const broadcast = await this.repository.findById(tenantId, id)
    if (!broadcast) {
      throw AppException.notFound('BROADCAST_NOT_FOUND', 'Campanha não encontrada')
    }
    if (broadcast.status !== 'PAUSED') {
      throw new AppException(
        'BROADCAST_CANNOT_RESUME',
        'Apenas campanhas pausadas podem ser retomadas',
      )
    }

    await this.repository.updateStatus(id, 'RUNNING')
    await this.producer.enqueue(id, tenantId)

    return { data: { ...broadcast, status: 'RUNNING' } }
  }

  async cancel(tenantId: string, id: string) {
    const broadcast = await this.repository.findById(tenantId, id)
    if (!broadcast) {
      throw AppException.notFound('BROADCAST_NOT_FOUND', 'Campanha não encontrada')
    }

    if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(broadcast.status)) {
      throw new AppException(
        'BROADCAST_CANNOT_CANCEL',
        'Esta campanha não pode ser cancelada',
      )
    }

    // Remove scheduled job from queue if SCHEDULED
    if (broadcast.status === 'SCHEDULED') {
      await this.producer.removeJob(id)
    }

    const updated = await this.repository.updateStatus(id, 'CANCELLED')
    return { data: updated }
  }

  async delete(tenantId: string, id: string) {
    const broadcast = await this.repository.findById(tenantId, id)
    if (!broadcast) {
      throw AppException.notFound('BROADCAST_NOT_FOUND', 'Campanha não encontrada')
    }
    if (broadcast.status === 'RUNNING') {
      throw new AppException(
        'BROADCAST_CANNOT_DELETE',
        'Não é possível excluir uma campanha em andamento. Pause ou cancele primeiro.',
      )
    }

    // Remove scheduled job if applicable
    if (broadcast.status === 'SCHEDULED') {
      await this.producer.removeJob(id)
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  /**
   * Calcula o delay em ms entre agora e o scheduledAt interpretado no timezone do tenant.
   * O scheduledAt vem como ISO 8601 com offset (e.g. "2026-03-07T10:00:00-03:00").
   * O delay é: scheduledAt(parsed) - now.
   */
  private calculateDelayMs(scheduledAt: string, _tenantId: string): number {
    const scheduledDate = new Date(scheduledAt)
    const now = new Date()
    const delayMs = scheduledDate.getTime() - now.getTime()
    return Math.max(delayMs, 0)
  }
}
