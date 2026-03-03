import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { InboxService } from './inbox.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { sendMessageSchema, SendMessageDto } from './dto/send-message.dto'
import {
  conversationFiltersSchema,
  ConversationFiltersDto,
} from './dto/conversation-filters.dto'

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  findConversations(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(conversationFiltersSchema)) filters: ConversationFiltersDto,
  ) {
    return this.inboxService.findConversations(tenantId, filters)
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

  @Post('conversations/:id/assign')
  @HttpCode(HttpStatus.OK)
  assignConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inboxService.assignConversation(tenantId, id, user.id)
  }

  @Post('conversations/:id/messages')
  @UsePipes(new ZodValidationPipe(sendMessageSchema))
  sendMessage(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.inboxService.sendMessage(tenantId, id, user.id, dto)
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
    @Body('assignedToId') assignedToId: string,
  ) {
    return this.inboxService.transferConversation(tenantId, id, assignedToId)
  }

  @Post('conversations/:id/reopen')
  @HttpCode(HttpStatus.OK)
  reopenConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inboxService.reopenConversation(tenantId, id)
  }
}
