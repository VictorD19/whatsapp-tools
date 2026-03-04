import { Injectable } from '@nestjs/common'
import { DealRepository } from './deal.repository'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { CreateDealDto } from './dto/create-deal.dto'
import { UpdateDealDto } from './dto/update-deal.dto'
import { MoveDealDto } from './dto/move-deal.dto'
import { CreateDealNoteDto } from './dto/create-deal-note.dto'
import { DealFiltersDto } from './dto/deal-filters.dto'

@Injectable()
export class DealService {
  constructor(
    private readonly repository: DealRepository,
    private readonly logger: LoggerService,
  ) {}

  async findDeals(tenantId: string, filters: DealFiltersDto) {
    const { deals, total } = await this.repository.findDeals(tenantId, {
      stageId: filters.stageId,
      assignedToId: filters.assignedToId,
      contactId: filters.contactId,
      pipelineId: filters.pipelineId,
      page: filters.page,
      limit: filters.limit,
    })

    return {
      data: deals,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    }
  }

  async findDealById(tenantId: string, id: string) {
    const deal = await this.repository.findDealById(tenantId, id)
    if (!deal) {
      throw AppException.notFound('DEAL_NOT_FOUND', 'Deal nao encontrado', { id })
    }
    return deal
  }

  async createDeal(tenantId: string, dto: CreateDealDto) {
    // Check if contact already has an active deal
    const existingDeal = await this.repository.findActiveDealByContact(tenantId, dto.contactId)
    if (existingDeal) {
      throw new AppException(
        'DEAL_ACTIVE_EXISTS',
        'Ja existe um deal ativo para este contato',
        { contactId: dto.contactId, existingDealId: existingDeal.id },
      )
    }

    let pipelineId = dto.pipelineId
    let stageId = dto.stageId

    // If no pipelineId, use default pipeline
    if (!pipelineId) {
      const defaultPipeline = await this.repository.findDefaultPipeline(tenantId)
      if (!defaultPipeline) {
        throw new AppException(
          'DEAL_STAGE_INVALID_PIPELINE',
          'Nenhum pipeline padrao encontrado para o tenant',
          { tenantId },
        )
      }
      pipelineId = defaultPipeline.id
    }

    // If no stageId, use default stage
    if (!stageId) {
      const defaultStage = await this.repository.findDefaultStage(pipelineId)
      if (!defaultStage) {
        throw new AppException(
          'DEAL_STAGE_INVALID_PIPELINE',
          'Nenhum estagio padrao encontrado no pipeline',
          { pipelineId },
        )
      }
      stageId = defaultStage.id
    } else {
      // Validate that stage belongs to the pipeline
      const stage = await this.repository.findStageById(stageId)
      if (!stage || stage.pipelineId !== pipelineId) {
        throw new AppException(
          'DEAL_STAGE_INVALID_PIPELINE',
          'Estagio nao pertence ao pipeline informado',
          { stageId, pipelineId },
        )
      }
    }

    const deal = await this.repository.createDeal({
      tenantId,
      pipelineId,
      stageId,
      contactId: dto.contactId,
      conversationId: dto.conversationId,
      title: dto.title,
      value: dto.value,
    })

    this.logger.log(
      `Deal ${deal.id} created for contact ${dto.contactId}`,
      'DealService',
    )

    return deal
  }

  async updateDeal(tenantId: string, id: string, dto: UpdateDealDto) {
    await this.findDealById(tenantId, id)

    const updated = await this.repository.updateDeal(id, {
      title: dto.title,
      value: dto.value,
      assignedToId: dto.assignedToId,
    })

    this.logger.log(`Deal ${id} updated`, 'DealService')

    return updated
  }

  async moveDeal(tenantId: string, id: string, dto: MoveDealDto) {
    const deal = await this.findDealById(tenantId, id)

    // Check if deal is already closed (WON or LOST)
    if (deal.stage.type === 'WON' || deal.stage.type === 'LOST') {
      throw new AppException(
        'DEAL_ALREADY_CLOSED',
        'Deal ja esta encerrado (ganho ou perdido)',
        { dealId: id, currentStageType: deal.stage.type },
      )
    }

    // Validate that the new stage belongs to the same pipeline
    const newStage = await this.repository.findStageById(dto.stageId)
    if (!newStage || newStage.pipelineId !== deal.pipelineId) {
      throw new AppException(
        'DEAL_STAGE_INVALID_PIPELINE',
        'Estagio nao pertence ao mesmo pipeline do deal',
        { stageId: dto.stageId, pipelineId: deal.pipelineId },
      )
    }

    const now = new Date()
    let wonAt: Date | null = deal.wonAt
    let lostAt: Date | null = deal.lostAt
    let lostReason: string | null = deal.lostReason

    if (newStage.type === 'WON') {
      wonAt = now
      lostAt = null
      lostReason = null
    } else if (newStage.type === 'LOST') {
      lostAt = now
      lostReason = dto.lostReason ?? null
      wonAt = null
    }

    const moved = await this.repository.moveDeal(id, {
      stageId: dto.stageId,
      wonAt,
      lostAt,
      lostReason,
    })

    this.logger.log(
      `Deal ${id} moved to stage ${dto.stageId} (${newStage.type})`,
      'DealService',
    )

    return moved
  }

  async deleteDeal(tenantId: string, id: string) {
    await this.findDealById(tenantId, id)

    await this.repository.softDeleteDeal(id)

    this.logger.log(`Deal ${id} soft deleted`, 'DealService')

    return { data: { message: 'Deal removido com sucesso' } }
  }

  // ── Deal Notes ──

  async findNotes(tenantId: string, dealId: string) {
    await this.findDealById(tenantId, dealId)

    const notes = await this.repository.findNotes(dealId, tenantId)
    return { data: notes }
  }

  async createNote(tenantId: string, dealId: string, authorId: string, dto: CreateDealNoteDto) {
    await this.findDealById(tenantId, dealId)

    const note = await this.repository.createNote({
      dealId,
      tenantId,
      authorId,
      content: dto.content,
    })

    this.logger.log(`Note ${note.id} created for deal ${dealId}`, 'DealService')

    return note
  }

  // ── Webhook integration ──

  async findOrCreateForContact(
    tenantId: string,
    contactId: string,
    conversationId?: string,
  ) {
    // Find existing active deal for contact
    const existingDeal = await this.repository.findActiveDealByContact(tenantId, contactId)

    if (existingDeal) {
      // Update conversationId if provided and deal has none
      if (conversationId && !existingDeal.conversationId) {
        await this.repository.updateConversationId(existingDeal.id, conversationId)
      }
      return existingDeal
    }

    // Find default pipeline
    const defaultPipeline = await this.repository.findDefaultPipeline(tenantId)
    if (!defaultPipeline) {
      this.logger.warn(
        `No default pipeline for tenant ${tenantId} — cannot auto-create deal`,
        'DealService',
      )
      return null
    }

    // Find default stage
    const defaultStage = await this.repository.findDefaultStage(defaultPipeline.id)
    if (!defaultStage) {
      this.logger.warn(
        `No default stage in pipeline ${defaultPipeline.id} — cannot auto-create deal`,
        'DealService',
      )
      return null
    }

    // Create new deal
    const deal = await this.repository.createDeal({
      tenantId,
      pipelineId: defaultPipeline.id,
      stageId: defaultStage.id,
      contactId,
      conversationId,
    })

    this.logger.log(
      `Auto-created deal ${deal.id} for contact ${contactId}`,
      'DealService',
    )

    return deal
  }
}
