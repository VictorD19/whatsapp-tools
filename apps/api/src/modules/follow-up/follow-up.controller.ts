import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { FollowUpService } from './follow-up.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createFollowUpSchema, CreateFollowUpDto } from './dto/create-follow-up.dto'
import { followUpFiltersSchema, FollowUpFiltersDto } from './dto/follow-up-filters.dto'

@Controller()
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post('conversations/:id/follow-ups')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('id') conversationId: string,
    @Req() req: FastifyRequest,
  ) {
    const contentType = req.headers['content-type'] ?? ''
    let dto: CreateFollowUpDto
    let mediaFile: { buffer: Buffer; mimetype: string; filename: string } | undefined

    if (contentType.includes('multipart/form-data')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = (req as any).parts()
      const fields: Record<string, string> = {}

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer: Buffer = await part.toBuffer()
          if (buffer.length > 0) {
            mediaFile = {
              buffer,
              mimetype: part.mimetype as string,
              filename: (part.filename as string) || 'arquivo',
            }
          }
        } else {
          fields[part.fieldname as string] = part.value as string
        }
      }

      const result = createFollowUpSchema.safeParse({
        type: fields.type,
        mode: fields.mode,
        scheduledAt: fields.scheduledAt,
        message: fields.message || undefined,
      })

      if (!result.success) {
        throw new BadRequestException(result.error.errors)
      }

      dto = result.data
    } else {
      dto = new ZodValidationPipe(createFollowUpSchema).transform(req.body, {
        type: 'body',
        metatype: undefined,
        data: undefined,
      }) as CreateFollowUpDto
    }

    return this.followUpService.create(tenantId, conversationId, user.id, dto, mediaFile)
  }

  @Get('conversations/:id/follow-ups')
  findByConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') conversationId: string,
    @Query(new ZodValidationPipe(followUpFiltersSchema)) filters: FollowUpFiltersDto,
  ) {
    return this.followUpService.findByConversation(tenantId, conversationId, filters)
  }

  @Delete('follow-ups/:id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.followUpService.cancel(tenantId, id)
  }
}
