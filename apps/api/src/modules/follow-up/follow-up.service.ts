import { Injectable, HttpStatus } from '@nestjs/common'
import { FollowUpRepository } from './follow-up.repository'
import { FollowUpProducer } from './queues/follow-up.producer'
import { AppException } from '@core/errors/app.exception'
import { StorageService } from '@modules/storage/storage.service'
import { CreateFollowUpDto } from './dto/create-follow-up.dto'
import { FollowUpFiltersDto } from './dto/follow-up-filters.dto'

@Injectable()
export class FollowUpService {
  constructor(
    private readonly repository: FollowUpRepository,
    private readonly producer: FollowUpProducer,
    private readonly storage: StorageService,
  ) {}

  async create(
    tenantId: string,
    conversationId: string,
    userId: string,
    dto: CreateFollowUpDto,
    mediaFile?: { buffer: Buffer; mimetype: string; filename: string },
  ) {
    if (dto.mode === 'AUTOMATIC' && !dto.message && !mediaFile) {
      throw new AppException(
        'FOLLOW_UP_MISSING_CONTENT',
        'Message or media attachment is required for AUTOMATIC mode',
        {},
        HttpStatus.UNPROCESSABLE_ENTITY,
      )
    }

    let mediaKey: string | undefined
    let mediaFilename: string | undefined

    if (mediaFile) {
      mediaKey = await this.storage.uploadMedia(
        tenantId,
        mediaFile.buffer,
        mediaFile.mimetype,
        mediaFile.filename,
      )
      mediaFilename = mediaFile.filename
    }

    const followUp = await this.repository.create({
      tenantId,
      conversationId,
      createdById: userId,
      type: dto.type,
      mode: dto.mode,
      scheduledAt: dto.scheduledAt,
      message: dto.message,
      mediaKey,
      mediaFilename,
    })

    await this.producer.schedule(followUp.id, new Date(dto.scheduledAt))

    return { data: followUp }
  }

  async findByConversation(
    tenantId: string,
    conversationId: string,
    filters: FollowUpFiltersDto,
  ) {
    const { followUps, total } = await this.repository.findByConversation(
      tenantId,
      conversationId,
      {
        status: filters.status as any,
        page: filters.page,
        limit: filters.limit,
      },
    )

    return {
      data: followUps,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    }
  }

  async cancel(tenantId: string, id: string) {
    const followUp = await this.repository.findById(tenantId, id)

    if (!followUp) {
      throw AppException.notFound(
        'FOLLOW_UP_NOT_FOUND',
        'Follow-up not found',
      )
    }

    if (followUp.status === 'CANCELLED') {
      throw new AppException(
        'FOLLOW_UP_ALREADY_CANCELLED',
        'Follow-up is already cancelled',
      )
    }

    if (followUp.status === 'SENT') {
      throw new AppException(
        'FOLLOW_UP_ALREADY_SENT',
        'Follow-up has already been sent and cannot be cancelled',
      )
    }

    const cancelled = await this.repository.cancel(tenantId, id)

    await this.producer.cancel(id)

    return { data: cancelled }
  }
}
