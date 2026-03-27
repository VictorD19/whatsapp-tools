import { Controller, Get, Post, Put, Delete, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { AppException } from '@core/errors/app.exception'
import { BroadcastsService } from './broadcasts.service'
import type { CreateBroadcastDto, VariationInput } from './dto/create-broadcast.dto'
import { listBroadcastsSchema, type ListBroadcastsDto } from './dto/list-broadcasts.dto'

@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  /**
   * POST /broadcasts — multipart form.
   *
   * Campos esperados:
   *   name, instanceIds[], contactListIds[], groups (JSON), delay, scheduledAt?,
   *   variations (JSON string): [{ messageType, text }]
   *   file-0, file-1, … — um arquivo por variação que tenha mídia (index corresponde ao array)
   */
  @Post()
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Req() req: FastifyRequest,
  ) {
    if (!req.isMultipart()) {
      throw new AppException('INVALID_CONTENT_TYPE', 'Request deve ser multipart/form-data')
    }
    const parts = (req as any).parts()

    const fields: Record<string, string | string[]> = {}
    const files = new Map<number, { buffer: Buffer; mimetype: string; filename: string }>()

    for await (const part of parts) {
      if (part.type === 'file') {
        // file-0, file-1, etc.
        const index = parseInt((part.fieldname as string).replace('file-', ''), 10)
        const buffer = await part.toBuffer()
        files.set(isNaN(index) ? 0 : index, {
          buffer,
          mimetype: part.mimetype as string,
          filename: (part.filename as string) || 'arquivo',
        })
      } else {
        const key = part.fieldname as string
        const value = part.value as string

        if (['instanceIds', 'contactListIds'].includes(key)) {
          if (!fields[key]) fields[key] = []
          ;(fields[key] as string[]).push(value)
        } else {
          fields[key] = value
        }
      }
    }

    // Parse DTO
    const dto: CreateBroadcastDto = {
      name: fields.name as string,
      instanceIds: (fields.instanceIds as string[]) || [],
      contactListIds: (fields.contactListIds as string[]) || [],
      groups: fields.groups ? JSON.parse(fields.groups as string) : [],
      delay: fields.delay ? Number(fields.delay) : 5,
      scheduledAt: (fields.scheduledAt as string) || undefined,
    }

    // Parse variations JSON + attach files
    const rawVariations: Array<{ messageType: string; text: string }> = fields.variations
      ? JSON.parse(fields.variations as string)
      : []

    const variations: VariationInput[] = rawVariations.map((v, i) => ({
      messageType: v.messageType as VariationInput['messageType'],
      text: v.text,
      file: files.get(i),
    }))

    return this.broadcastsService.create(tenantId, user.id, dto, variations)
  }

  /**
   * PUT /broadcasts/:id — multipart form (same format as create).
   * Only DRAFT/SCHEDULED broadcasts can be updated.
   */
  @Put(':id')
  async update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    if (!req.isMultipart()) {
      throw new AppException('INVALID_CONTENT_TYPE', 'Request deve ser multipart/form-data')
    }
    const parts = (req as any).parts()

    const fields: Record<string, string | string[]> = {}
    const files = new Map<number, { buffer: Buffer; mimetype: string; filename: string }>()

    for await (const part of parts) {
      if (part.type === 'file') {
        const index = parseInt((part.fieldname as string).replace('file-', ''), 10)
        const buffer = await part.toBuffer()
        files.set(isNaN(index) ? 0 : index, {
          buffer,
          mimetype: part.mimetype as string,
          filename: (part.filename as string) || 'arquivo',
        })
      } else {
        const key = part.fieldname as string
        const value = part.value as string

        if (['instanceIds', 'contactListIds'].includes(key)) {
          if (!fields[key]) fields[key] = []
          ;(fields[key] as string[]).push(value)
        } else {
          fields[key] = value
        }
      }
    }

    const dto: CreateBroadcastDto = {
      name: fields.name as string,
      instanceIds: (fields.instanceIds as string[]) || [],
      contactListIds: (fields.contactListIds as string[]) || [],
      groups: fields.groups ? JSON.parse(fields.groups as string) : [],
      delay: fields.delay ? Number(fields.delay) : 5,
      scheduledAt: (fields.scheduledAt as string) || undefined,
    }

    const rawVariations: Array<{
      messageType: string
      text: string
      existingMediaUrl?: string
      existingFileName?: string
    }> = fields.variations
      ? JSON.parse(fields.variations as string)
      : []

    const variations: VariationInput[] = rawVariations.map((v, i) => ({
      messageType: v.messageType as VariationInput['messageType'],
      text: v.text,
      file: files.get(i),
      existingMediaUrl: v.existingMediaUrl,
      existingFileName: v.existingFileName,
    }))

    return this.broadcastsService.update(tenantId, id, dto, variations)
  }

  @Get()
  findMany(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(listBroadcastsSchema)) filters: ListBroadcastsDto,
  ) {
    return this.broadcastsService.list(tenantId, filters)
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.findOne(tenantId, id)
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.pause(tenantId, id)
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.resume(tenantId, id)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.cancel(tenantId, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.delete(tenantId, id)
  }
}
