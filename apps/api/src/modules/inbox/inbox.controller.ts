import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { InboxService } from './inbox.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { sendMessageSchema, SendMessageDto } from './dto/send-message.dto'
import {
  conversationFiltersSchema,
  ConversationFiltersDto,
} from './dto/conversation-filters.dto'
import {
  transferConversationSchema,
  TransferConversationDto,
} from './dto/assign-conversation.dto'
import {
  importConversationsSchema,
  ImportConversationsDto,
} from './dto/import-conversations.dto'
import {
  startConversationSchema,
  StartConversationDto,
} from './dto/start-conversation.dto'

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Post('conversations/start')
  @HttpCode(HttpStatus.OK)
  startConversation(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(startConversationSchema)) dto: StartConversationDto,
  ) {
    return this.inboxService.startOutboundConversation(tenantId, user.id, dto)
  }

  @Get('conversations')
  findConversations(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
    @Query(new ZodValidationPipe(conversationFiltersSchema)) filters: ConversationFiltersDto,
  ) {
    return this.inboxService.findConversations(tenantId, filters, user.id)
  }

  @Get('conversations/:id')
  findConversationById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.findConversationById(tenantId, id)
  }

  @Get('conversations/:id/messages')
  findMessages(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inboxService.findMessages(
      tenantId,
      id,
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '50', 10),
    )
  }

  @Get('messages/:messageId/media')
  async getMedia(
    @CurrentTenant() tenantId: string,
    @Param('messageId') messageId: string,
    @Res() res: FastifyReply,
  ) {
    const { buffer, mimetype } = await this.inboxService.getMedia(tenantId, messageId)
    res
      .header('Content-Type', mimetype)
      .header('Content-Length', buffer.length)
      .header('Cache-Control', 'private, max-age=86400')
      .header('Accept-Ranges', 'bytes')
      .send(buffer)
  }

  @Post('conversations/:id/assign')
  @HttpCode(HttpStatus.OK)
  assignConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inboxService.assignConversation(tenantId, id, user.id)
  }

  @Get('conversations/:id/group-members')
  getGroupMembers(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.getGroupMembers(tenantId, id)
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.inboxService.sendMessage(tenantId, id, user.id, dto, user.role)
  }

  @Post('conversations/:id/close')
  @HttpCode(HttpStatus.OK)
  closeConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inboxService.closeConversation(tenantId, id, user.id)
  }

  @Post('conversations/:id/transfer')
  @HttpCode(HttpStatus.OK)
  transferConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transferConversationSchema)) dto: TransferConversationDto,
  ) {
    return this.inboxService.transferConversation(tenantId, id, dto.assignedToId)
  }

  @Post('conversations/:id/sync')
  @HttpCode(HttpStatus.OK)
  syncMessages(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.syncConversationMessages(tenantId, id)
  }

  @Post('conversations/:id/reopen')
  @HttpCode(HttpStatus.OK)
  reopenConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.reopenConversation(tenantId, id)
  }

  @Post('conversations/:id/media')
  async sendMedia(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Req() req: FastifyRequest,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (req as any).parts()
    let fileBuffer: Buffer | null = null
    let mimetype = ''
    let filename = 'arquivo'
    let caption: string | undefined

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer()
        mimetype = part.mimetype as string
        filename = (part.filename as string) || 'arquivo'
      } else if (part.fieldname === 'caption') {
        caption = part.value as string
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('Nenhum arquivo enviado')
    }

    return this.inboxService.sendMediaMessage(tenantId, id, user.id, user.role, {
      buffer: fileBuffer,
      mimetype,
      filename,
      caption,
    })
  }

  @Post('instances/:instanceId/import-conversations')
  @HttpCode(HttpStatus.ACCEPTED)
  importConversations(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('instanceId') instanceId: string,
    @Body(new ZodValidationPipe(importConversationsSchema)) dto: ImportConversationsDto,
  ) {
    return this.inboxService.startConversationImport(tenantId, instanceId, dto, user?.id)
  }
}
