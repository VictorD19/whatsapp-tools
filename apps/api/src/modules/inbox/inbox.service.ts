import { Injectable, HttpStatus } from '@nestjs/common'
import { InboxRepository } from './inbox.repository'
import { InboxGateway } from './inbox.gateway'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { ConversationFiltersDto } from './dto/conversation-filters.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { ConversationStatus } from '@prisma/client'

@Injectable()
export class InboxService {
  constructor(
    private readonly repository: InboxRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly gateway: InboxGateway,
    private readonly logger: LoggerService,
  ) {}

  async findConversations(tenantId: string, filters: ConversationFiltersDto) {
    const { conversations, total } = await this.repository.findConversations(tenantId, {
      status: filters.status as ConversationStatus | undefined,
      assignedToId: filters.assignedToId,
      instanceId: filters.instanceId,
      page: filters.page,
      limit: filters.limit,
    })

    return {
      data: conversations,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    }
  }

  async findConversationById(tenantId: string, id: string) {
    const conversation = await this.repository.findConversationById(tenantId, id)
    if (!conversation) {
      throw AppException.notFound('CONVERSATION_NOT_FOUND', 'Conversa não encontrada', { id })
    }
    return conversation
  }

  async findMessages(tenantId: string, conversationId: string, page: number, limit: number) {
    // Verify conversation belongs to tenant
    await this.findConversationById(tenantId, conversationId)

    const { messages, total } = await this.repository.findMessages(
      tenantId,
      conversationId,
      page,
      limit,
    )

    return {
      data: messages,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async assignConversation(tenantId: string, conversationId: string, userId: string) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status !== 'PENDING') {
      throw new AppException(
        'CONVERSATION_NOT_PENDING',
        'Apenas conversas pendentes podem ser assumidas',
        { status: conversation.status },
      )
    }

    if (conversation.assignedToId) {
      throw new AppException(
        'CONVERSATION_ALREADY_ASSIGNED',
        'Conversa já está atribuída a outro atendente',
        { assignedToId: conversation.assignedToId },
      )
    }

    const updated = await this.repository.assignConversation(tenantId, conversationId, userId)

    this.gateway.emitConversationAssigned(tenantId, {
      conversationId,
      assignedToId: userId,
      status: 'OPEN',
    })

    this.logger.log(
      `Conversation ${conversationId} assigned to ${userId}`,
      'InboxService',
    )

    return updated
  }

  async sendMessage(
    tenantId: string,
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status !== 'OPEN') {
      throw new AppException(
        'CONVERSATION_NOT_OPEN',
        'Só é possível enviar mensagens em conversas abertas',
        { status: conversation.status },
      )
    }

    if (conversation.assignedToId !== userId) {
      throw new AppException(
        'CONVERSATION_ALREADY_ASSIGNED',
        'Você não está atribuído a esta conversa',
        { assignedToId: conversation.assignedToId },
      )
    }

    // Get contact phone and instance evolutionId
    const contactPhone = conversation.contact.phone
    const evolutionId = conversation.instance.evolutionId

    // Send via WhatsApp
    let messageResult: { messageId: string; status: string }
    try {
      messageResult = await this.whatsapp.sendText(evolutionId, contactPhone, dto.body)
    } catch (error) {
      this.logger.error(
        `Failed to send message: ${(error as Error).message}`,
        (error as Error).stack,
        'InboxService',
      )
      throw new AppException(
        'MESSAGE_SEND_FAILED',
        'Falha ao enviar mensagem via WhatsApp',
        { reason: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      )
    }

    // Save message to DB
    const message = await this.repository.createMessage({
      tenantId,
      conversationId,
      fromMe: true,
      body: dto.body,
      type: 'TEXT',
      status: 'SENT',
      evolutionId: messageResult.messageId,
    })

    // Emit WebSocket
    this.gateway.emitNewMessage(tenantId, {
      conversationId,
      message: {
        id: message.id,
        fromMe: true,
        body: message.body,
        type: message.type,
        sentAt: message.sentAt,
        status: message.status,
      },
    })

    return message
  }

  async closeConversation(tenantId: string, conversationId: string, userId: string) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status === 'CLOSE') {
      throw new AppException(
        'CONVERSATION_ALREADY_CLOSED',
        'Conversa já está encerrada',
        { conversationId },
      )
    }

    if (conversation.status !== 'OPEN') {
      throw new AppException(
        'CONVERSATION_NOT_OPEN',
        'Só é possível encerrar conversas abertas',
        { status: conversation.status },
      )
    }

    const updated = await this.repository.closeConversation(tenantId, conversationId)

    this.gateway.emitConversationClosed(tenantId, {
      conversationId,
      closedBy: userId,
    })

    this.logger.log(`Conversation ${conversationId} closed by ${userId}`, 'InboxService')

    return updated
  }

  async transferConversation(
    tenantId: string,
    conversationId: string,
    newAssignedToId: string,
  ) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status === 'CLOSE') {
      throw new AppException(
        'CONVERSATION_ALREADY_CLOSED',
        'Não é possível transferir conversa encerrada',
        { conversationId },
      )
    }

    const updated = await this.repository.transferConversation(
      tenantId,
      conversationId,
      newAssignedToId,
    )

    this.gateway.emitConversationTransferred(tenantId, {
      conversationId,
      previousAssignedToId: conversation.assignedToId,
      newAssignedToId,
    })

    this.logger.log(
      `Conversation ${conversationId} transferred to ${newAssignedToId}`,
      'InboxService',
    )

    return updated
  }

  async reopenConversation(tenantId: string, conversationId: string) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status !== 'CLOSE') {
      throw new AppException(
        'CONVERSATION_NOT_OPEN',
        'Só é possível reabrir conversas encerradas',
        { status: conversation.status },
      )
    }

    const updated = await this.repository.reopenConversation(tenantId, conversationId)

    this.gateway.emitConversationCreated(tenantId, {
      conversationId,
      status: 'PENDING',
      reopened: true,
    })

    this.logger.log(`Conversation ${conversationId} reopened`, 'InboxService')

    return updated
  }
}
