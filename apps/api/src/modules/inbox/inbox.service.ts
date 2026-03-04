import { Injectable, HttpStatus } from '@nestjs/common'
import { InboxRepository } from './inbox.repository'
import { InboxGateway } from './inbox.gateway'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstancesService } from '@modules/instances/instances.service'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { ConversationFiltersDto } from './dto/conversation-filters.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { ImportConversationsDto } from './dto/import-conversations.dto'
import { ConversationImportProducer } from './queues/import.producer'
import { ConversationStatus } from '@prisma/client'

@Injectable()
export class InboxService {
  constructor(
    private readonly repository: InboxRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly instancesService: InstancesService,
    private readonly gateway: InboxGateway,
    private readonly importProducer: ConversationImportProducer,
    private readonly logger: LoggerService,
  ) {}

  async findConversations(
    tenantId: string,
    filters: ConversationFiltersDto,
    userId?: string,
  ) {
    // Tab-based filtering takes priority over raw status/assignedToId
    let status: ConversationStatus | undefined = filters.status as ConversationStatus | undefined
    let statusNot: ConversationStatus | undefined
    let assignedToId: string | undefined = filters.assignedToId
    let unassigned = false

    if (filters.tab) {
      switch (filters.tab) {
        case 'all':
          // All active conversations (not closed)
          status = undefined
          statusNot = 'CLOSE'
          assignedToId = undefined
          break
        case 'mine':
          // Assigned to current user, not closed
          statusNot = 'CLOSE'
          assignedToId = userId
          break
        case 'unassigned':
          // No assignment, pending status
          status = 'PENDING'
          unassigned = true
          break
      }
    } else if (filters.assignedToMe && userId) {
      assignedToId = userId
    }

    const { conversations, total } = await this.repository.findConversations(tenantId, {
      status,
      statusNot,
      assignedToId,
      unassigned,
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
      throw AppException.notFound('CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', { id })
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
        'Conversa ja esta atribuida a outro atendente',
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
    role?: string,
  ) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status !== 'OPEN') {
      throw new AppException(
        'CONVERSATION_NOT_OPEN',
        'So e possivel enviar mensagens em conversas abertas',
        { status: conversation.status },
      )
    }

    // Admin can send messages in any open conversation
    if (role !== 'admin' && conversation.assignedToId !== userId) {
      throw new AppException(
        'CONVERSATION_ALREADY_ASSIGNED',
        'Voce nao esta atribuido a esta conversa',
        { assignedToId: conversation.assignedToId },
      )
    }

    // Get contact phone and instance evolutionId
    const contactPhone = conversation.contact.phone
    const evolutionId = conversation.instance.evolutionId

    // Validate quotedMessageId if provided
    let quotedMessageEvolutionId: string | undefined
    if (dto.quotedMessageId) {
      const quotedMsg = await this.repository.findMessageById(tenantId, dto.quotedMessageId)
      if (!quotedMsg) {
        throw AppException.notFound(
          'INBOX_QUOTED_MESSAGE_NOT_FOUND',
          'Mensagem citada nao encontrada',
          { quotedMessageId: dto.quotedMessageId },
        )
      }
      quotedMessageEvolutionId = quotedMsg.evolutionId ?? undefined
    }

    // Send via WhatsApp
    let messageResult: { messageId: string; status: string }
    try {
      messageResult = await this.whatsapp.sendText(evolutionId, contactPhone, dto.body, {
        quotedMessageEvolutionId,
      })
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
      quotedMessageId: dto.quotedMessageId,
    })

    // Update lastMessageAt
    await this.repository.updateLastMessageAt(conversationId)

    // Emit WebSocket
    this.gateway.emitNewMessage(tenantId, {
      conversationId,
      message: {
        id: message.id,
        conversationId,
        fromMe: true,
        fromBot: false,
        body: message.body,
        type: message.type,
        status: message.status,
        mediaUrl: message.mediaUrl,
        quotedMessageId: message.quotedMessageId,
        quotedMessage: message.quotedMessage,
        sentAt: message.sentAt,
        createdAt: message.createdAt,
      },
    })

    return message
  }

  async closeConversation(tenantId: string, conversationId: string, userId: string) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status === 'CLOSE') {
      throw new AppException(
        'CONVERSATION_ALREADY_CLOSED',
        'Conversa ja esta encerrada',
        { conversationId },
      )
    }

    if (conversation.status !== 'OPEN') {
      throw new AppException(
        'CONVERSATION_NOT_OPEN',
        'So e possivel encerrar conversas abertas',
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
        'Nao e possivel transferir conversa encerrada',
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
        'So e possivel reabrir conversas encerradas',
        { status: conversation.status },
      )
    }

    const updated = await this.repository.reopenConversation(tenantId, conversationId)

    const fullConversation = await this.repository.findConversationById(tenantId, conversationId)
    if (fullConversation) {
      this.gateway.emitConversationCreated(tenantId, {
        conversation: fullConversation,
      })
    }

    this.logger.log(`Conversation ${conversationId} reopened`, 'InboxService')

    return updated
  }

  async startConversationImport(
    tenantId: string,
    instanceId: string,
    dto: ImportConversationsDto,
  ) {
    const instance = await this.instancesService.findOne(tenantId, instanceId)

    if (instance.status !== 'CONNECTED') {
      throw new AppException(
        'IMPORT_INSTANCE_NOT_CONNECTED',
        'A instancia precisa estar conectada para importar conversas',
        { status: instance.status },
      )
    }

    try {
      await this.importProducer.startImport({
        tenantId,
        instanceId,
        evolutionId: instance.evolutionId,
        messageLimit: dto.messageLimit,
      })
    } catch (error) {
      // BullMQ rejects duplicate jobId — means import already running
      if ((error as Error).message?.includes('Job is already')) {
        throw new AppException(
          'IMPORT_ALREADY_IN_PROGRESS',
          'Ja existe uma importacao em andamento para esta instancia',
          { instanceId },
        )
      }
      throw error
    }

    this.logger.log(
      `Conversation import started for instance ${instanceId}`,
      'InboxService',
    )

    return { data: { message: 'Importacao iniciada', instanceId } }
  }
}
