import { Injectable } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { StorageService } from '@modules/storage/storage.service'
import { BroadcastsRepository } from './broadcasts.repository'
import { BroadcastProducer } from './queues/broadcast.producer'
import type { CreateBroadcastDto, VariationInput } from './dto/create-broadcast.dto'
import type { ListBroadcastsDto } from './dto/list-broadcasts.dto'

/** Limites de tamanho por tipo de mídia. */
const SIZE_LIMITS: Record<string, number> = {
  IMAGE: 16 * 1024 * 1024,
  VIDEO: 16 * 1024 * 1024,
  AUDIO: 16 * 1024 * 1024,
  DOCUMENT: 100 * 1024 * 1024,
}

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly repository: BroadcastsRepository,
    private readonly producer: BroadcastProducer,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateBroadcastDto,
    variations: VariationInput[],
  ) {
    if (variations.length === 0) {
      throw new AppException('BROADCAST_NO_VARIATIONS', 'Adicione pelo menos uma variação de mensagem')
    }

    // 0. Upload media files and build variation records
    const variationRecords: Array<{
      messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
      text: string
      mediaUrl?: string
      fileName?: string
      sortOrder: number
    }> = []

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      let mediaUrl: string | undefined
      let fileName: string | undefined

      if (v.file && v.messageType !== 'TEXT') {
        const sizeLimit = SIZE_LIMITS[v.messageType] ?? 16 * 1024 * 1024
        if (v.file.buffer.length > sizeLimit) {
          throw new AppException(
            'FILE_TOO_LARGE',
            `Variação ${i + 1}: arquivo excede o limite de ${sizeLimit / (1024 * 1024)} MB`,
          )
        }
        mediaUrl = await this.storage.uploadMedia(tenantId, v.file.buffer, v.file.mimetype, v.file.filename)
        fileName = v.file.filename
      }

      variationRecords.push({
        messageType: v.messageType,
        text: v.text,
        mediaUrl,
        fileName,
        sortOrder: i,
      })
    }

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

    // 7. Determine status and convert scheduledAt to UTC
    const isScheduled = !!dto.scheduledAt
    const status = isScheduled ? ('SCHEDULED' as const) : ('RUNNING' as const)

    let scheduledAtUtc: Date | undefined
    if (isScheduled && dto.scheduledAt) {
      const timezone = await this.repository.getTenantTimezone(tenantId)
      scheduledAtUtc = this.localToUtc(dto.scheduledAt, timezone)
    }

    // 8. Create broadcast with variations
    const broadcast = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      createdBy: { connect: { id: userId } },
      name: dto.name,
      status,
      // Keep legacy fields populated with first variation for backward compat
      messageType: variationRecords[0].messageType,
      messageTexts: variationRecords.map((v) => v.text),
      delay: dto.delay,
      scheduledAt: scheduledAtUtc,
      instanceIds: dto.instanceIds,
      sources,
      recipients,
      variationRecords,
    })

    // 9. Enqueue job
    let delayMs: number | undefined
    if (scheduledAtUtc) {
      delayMs = Math.max(scheduledAtUtc.getTime() - Date.now(), 0)
    }
    await this.producer.enqueue(broadcast.id, tenantId, delayMs)

    this.logger.log(
      `Broadcast ${broadcast.id} created: ${recipients.length} recipients, ${variationRecords.length} variations, status=${status}`,
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

  async update(
    tenantId: string,
    id: string,
    dto: CreateBroadcastDto,
    variations: VariationInput[],
  ) {
    const broadcast = await this.repository.findById(tenantId, id)
    if (!broadcast) {
      throw AppException.notFound('BROADCAST_NOT_FOUND', 'Campanha não encontrada')
    }

    if (!['DRAFT', 'SCHEDULED'].includes(broadcast.status)) {
      throw new AppException(
        'BROADCAST_CANNOT_EDIT',
        'Apenas campanhas agendadas ou em rascunho podem ser editadas',
      )
    }

    if (variations.length === 0) {
      throw new AppException('BROADCAST_NO_VARIATIONS', 'Adicione pelo menos uma variação de mensagem')
    }

    // Upload media files
    const variationRecords: Array<{
      messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
      text: string
      mediaUrl?: string
      fileName?: string
      sortOrder: number
    }> = []

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      let mediaUrl: string | undefined
      let fileName: string | undefined

      if (v.file && v.messageType !== 'TEXT') {
        const sizeLimit = SIZE_LIMITS[v.messageType] ?? 16 * 1024 * 1024
        if (v.file.buffer.length > sizeLimit) {
          throw new AppException(
            'FILE_TOO_LARGE',
            `Variação ${i + 1}: arquivo excede o limite de ${sizeLimit / (1024 * 1024)} MB`,
          )
        }
        mediaUrl = await this.storage.uploadMedia(tenantId, v.file.buffer, v.file.mimetype, v.file.filename)
        fileName = v.file.filename
      } else if (v.messageType !== 'TEXT' && v.existingMediaUrl) {
        // Keep existing media from previous version
        mediaUrl = v.existingMediaUrl
        fileName = v.existingFileName
      }

      variationRecords.push({
        messageType: v.messageType,
        text: v.text,
        mediaUrl,
        fileName,
        sortOrder: i,
      })
    }

    // Validate instances
    const instances = await this.repository.findInstancesByIds(tenantId, dto.instanceIds)
    if (instances.length === 0) {
      throw AppException.notFound('INSTANCE_NOT_FOUND', 'Nenhuma instância encontrada')
    }

    const connectedInstances = instances.filter((i) => i.status === 'CONNECTED')
    if (connectedInstances.length === 0) {
      throw new AppException(
        'BROADCAST_NO_CONNECTED_INSTANCE',
        'Nenhuma instância conectada.',
      )
    }

    // Resolve recipients
    const contactListRecipients = await this.repository.resolveContactListRecipients(
      tenantId,
      dto.contactListIds,
    )

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

    // Remove old scheduled job if any
    if (broadcast.status === 'SCHEDULED') {
      await this.producer.removeJob(id)
    }

    // Determine status and convert scheduledAt to UTC
    const isScheduled = !!dto.scheduledAt
    const status = isScheduled ? ('SCHEDULED' as const) : ('DRAFT' as const)

    let scheduledAtUtc: Date | null = null
    if (isScheduled && dto.scheduledAt) {
      const timezone = await this.repository.getTenantTimezone(tenantId)
      scheduledAtUtc = this.localToUtc(dto.scheduledAt, timezone)
    }

    // Build sources
    const sources: Array<{
      sourceType: 'CONTACT_LIST' | 'GROUP'
      contactListId?: string
      groupJid?: string
      groupName?: string
    }> = [
      ...dto.contactListIds.map((cid) => ({
        sourceType: 'CONTACT_LIST' as const,
        contactListId: cid,
      })),
      ...dto.groups.map((g) => ({
        sourceType: 'GROUP' as const,
        groupJid: g.jid,
        groupName: g.name,
      })),
    ]

    const updated = await this.repository.update(id, {
      name: dto.name,
      delay: dto.delay,
      scheduledAt: scheduledAtUtc,
      status,
      messageType: variationRecords[0].messageType,
      messageTexts: variationRecords.map((v) => v.text),
      instanceIds: dto.instanceIds,
      contactListIds: dto.contactListIds,
      sources,
      recipients,
      variationRecords,
    })

    // Re-enqueue if scheduled
    if (scheduledAtUtc) {
      const delayMs = Math.max(scheduledAtUtc.getTime() - Date.now(), 0)
      await this.producer.enqueue(id, tenantId, delayMs)
    }

    this.logger.log(
      `Broadcast ${id} updated: ${recipients.length} recipients, ${variationRecords.length} variations, status=${status}`,
      'BroadcastsService',
    )

    return { data: updated }
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
    if (broadcast.status === 'RUNNING' || broadcast.status === 'COMPLETED') {
      throw new AppException(
        'BROADCAST_CANNOT_DELETE',
        broadcast.status === 'COMPLETED'
          ? 'Não é possível excluir uma campanha já concluída.'
          : 'Não é possível excluir uma campanha em andamento. Pause ou cancele primeiro.',
      )
    }

    if (broadcast.status === 'SCHEDULED') {
      await this.producer.removeJob(id)
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  /**
   * Interpreta uma string datetime-local (ex: "2026-03-27T10:00") como
   * horário no timezone do tenant e retorna um Date UTC.
   */
  private localToUtc(localDateTime: string, timezone: string): Date {
    // Formata a data no timezone alvo para descobrir o offset
    const fakeUtc = new Date(`${localDateTime}:00Z`)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    // Calcula o offset do timezone naquele instante
    const parts = formatter.formatToParts(fakeUtc)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
    const tzTime = new Date(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`,
    )
    const offsetMs = tzTime.getTime() - fakeUtc.getTime()

    // Subtrai o offset para converter local → UTC
    return new Date(fakeUtc.getTime() - offsetMs)
  }
}
