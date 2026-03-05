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
import { parseWhatsAppMessage } from './utils/message-parser'
import { StorageService, isStorageKey, STORABLE_MEDIA_TYPES } from '@modules/storage/storage.service'

// ─── WhatsApp supported formats & limits ──────────────────────────────────────
// Images: JPG, PNG — 16 MB
// Videos: MP4, AVI, MOV, 3GP — 16 MB
// Audio:  MP3, WAV, OGG — 16 MB
// Documents: PDF, DOCX, XLSX, PPTX, TXT, RTF, ZIP, RAR — 100 MB

const SIZE_LIMITS: Record<string, number> = {
  IMAGE: 16 * 1024 * 1024,
  VIDEO: 16 * 1024 * 1024,
  AUDIO: 16 * 1024 * 1024,
  DOCUMENT: 100 * 1024 * 1024,
}

const AUDIO_EXTS = new Set(['.ogg', '.oga', '.mp3', '.wav'])
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png'])
const VIDEO_EXTS = new Set(['.mp4', '.avi', '.mov', '.3gp'])

const AUDIO_MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

/** Normalizes misidentified MIME types (e.g. application/ogg → audio/ogg) using file extension */
function normalizeMimetype(mimetype: string, filename: string): string {
  if (mimetype.startsWith('audio/') || mimetype.startsWith('image/') || mimetype.startsWith('video/')) return mimetype
  const ext = getExtension(filename)
  if (AUDIO_EXTS.has(ext)) return AUDIO_MIME_MAP[ext] ?? 'audio/ogg'
  if (IMAGE_EXTS.has(ext)) return ext === '.png' ? 'image/png' : 'image/jpeg'
  if (VIDEO_EXTS.has(ext)) return ext === '.mov' ? 'video/quicktime' : ext === '.3gp' ? 'video/3gpp' : `video/${ext.slice(1)}`
  return mimetype
}

function resolveMediaType(mimetype: string, filename = ''): {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  sizeLimit: number
} {
  const normalized = normalizeMimetype(mimetype, filename)
  if (normalized.startsWith('image/')) return { type: 'IMAGE', sizeLimit: SIZE_LIMITS.IMAGE }
  if (normalized.startsWith('video/')) return { type: 'VIDEO', sizeLimit: SIZE_LIMITS.VIDEO }
  if (normalized.startsWith('audio/')) return { type: 'AUDIO', sizeLimit: SIZE_LIMITS.AUDIO }
  return { type: 'DOCUMENT', sizeLimit: SIZE_LIMITS.DOCUMENT }
}

@Injectable()
export class InboxService {
  constructor(
    private readonly repository: InboxRepository,
    private readonly whatsapp: WhatsAppService,
    private readonly instancesService: InstancesService,
    private readonly gateway: InboxGateway,
    private readonly importProducer: ConversationImportProducer,
    private readonly storage: StorageService,
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

  async getGroupMembers(tenantId: string, conversationId: string) {
    const conversation = await this.findConversationById(tenantId, conversationId)
    const contactPhone = conversation.contact.phone

    if (!contactPhone.endsWith('@g.us')) {
      throw new AppException(
        'NOT_A_GROUP',
        'Esta conversa nao e um grupo',
        { conversationId },
      )
    }

    const evolutionId = conversation.instance.evolutionId
    const members = await this.whatsapp.getGroupMembers(evolutionId, contactPhone)

    return { data: members }
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

    // Send via WhatsApp — with mentions if provided
    const isGroup = contactPhone.endsWith('@g.us')
    const hasMentions = dto.mentions && dto.mentions.length > 0

    let messageResult: { messageId: string; status: string }
    let cleanBody = dto.body
    try {
      if (hasMentions && isGroup) {
        // Strip mention markers from text: @todos and @[Name]
        cleanBody = dto.body
          .replace(/@todos\s*/g, '')
          .replace(/@\[.*?\]\s*/g, '')
          .trim() || dto.body
        messageResult = await this.whatsapp.sendGroupMention(evolutionId, contactPhone, {
          text: cleanBody,
          mentions: dto.mentions!,
        })
      } else {
        messageResult = await this.whatsapp.sendText(evolutionId, contactPhone, dto.body, {
          quotedMessageEvolutionId,
        })
      }
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

    // Save message to DB (cleanBody has markers stripped for group mentions)
    const message = await this.repository.createMessage({
      tenantId,
      conversationId,
      fromMe: true,
      body: cleanBody,
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

  async sendMediaMessage(
    tenantId: string,
    conversationId: string,
    userId: string,
    role: string,
    file: { buffer: Buffer; mimetype: string; filename: string; caption?: string },
  ) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    if (conversation.status !== 'OPEN') {
      throw new AppException(
        'CONVERSATION_NOT_OPEN',
        'So e possivel enviar mensagens em conversas abertas',
        { status: conversation.status },
      )
    }

    if (role !== 'admin' && conversation.assignedToId !== userId) {
      throw new AppException(
        'CONVERSATION_ALREADY_ASSIGNED',
        'Voce nao esta atribuido a esta conversa',
        { assignedToId: conversation.assignedToId },
      )
    }

    const resolvedMimetype = normalizeMimetype(file.mimetype, file.filename)
    const { type, sizeLimit } = resolveMediaType(resolvedMimetype, file.filename)

    if (file.buffer.length > sizeLimit) {
      throw new AppException(
        'FILE_TOO_LARGE',
        `Arquivo excede o limite permitido (${Math.round(sizeLimit / 1024 / 1024)}MB)`,
        { mimetype: file.mimetype, size: file.buffer.length, limit: sizeLimit },
        HttpStatus.UNPROCESSABLE_ENTITY,
      )
    }

    const contactPhone = conversation.contact.phone
    const evolutionId = conversation.instance.evolutionId
    const base64 = file.buffer.toString('base64')

    let messageResult: { messageId: string; status: string }
    try {
      switch (type) {
        case 'IMAGE':
          messageResult = await this.whatsapp.sendImage(evolutionId, contactPhone, { url: base64, mimetype: resolvedMimetype, caption: file.caption })
          break
        case 'VIDEO':
          messageResult = await this.whatsapp.sendVideo(evolutionId, contactPhone, { url: base64, mimetype: resolvedMimetype, caption: file.caption })
          break
        case 'AUDIO':
          messageResult = await this.whatsapp.sendAudio(evolutionId, contactPhone, { url: base64, mimetype: resolvedMimetype })
          break
        default:
          messageResult = await this.whatsapp.sendDocument(evolutionId, contactPhone, {
            url: base64,
            fileName: file.filename,
            mimetype: resolvedMimetype,
          })
      }
    } catch (error) {
      this.logger.error(
        `Failed to send media: ${(error as Error).message}`,
        (error as Error).stack,
        'InboxService',
      )
      throw new AppException(
        'MEDIA_UPLOAD_FAILED',
        'Falha ao enviar midia via WhatsApp',
        { reason: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      )
    }

    // Salva mídia no storage local (MinIO) — independente do Evolution API
    let storageKey: string | undefined
    if (STORABLE_MEDIA_TYPES.has(type)) {
      try {
        storageKey = await this.storage.uploadMedia(tenantId, file.buffer, file.mimetype, file.filename)
      } catch (err) {
        this.logger.warn(
          `Storage upload failed for outbound media, falling back: ${(err as Error).message}`,
          'InboxService',
        )
      }
    }

    const message = await this.repository.createMessage({
      tenantId,
      conversationId,
      fromMe: true,
      body: file.caption || null,
      type,
      status: 'SENT',
      evolutionId: messageResult.messageId,
      mediaUrl: storageKey ?? 'has-media',
    })

    await this.repository.updateLastMessageAt(conversationId)

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
        quotedMessageId: null,
        quotedMessage: null,
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

  /**
   * Retorna a mídia de uma mensagem.
   * - Se estiver no storage local (MinIO): retorna URL pré-assinada para redirect.
   * - Caso contrário: busca no Evolution API e retorna base64 (fallback).
   */
  async getMedia(
    tenantId: string,
    messageId: string,
  ): Promise<{ buffer: Buffer; mimetype: string }> {
    const message = await this.repository.findMessageWithInstance(tenantId, messageId)
    if (!message) {
      throw AppException.notFound('MESSAGE_NOT_FOUND', 'Mensagem nao encontrada')
    }

    // Mídia armazenada localmente — baixa do storage e faz proxy (evita redirect + 403 no Range request)
    if (isStorageKey(message.mediaUrl)) {
      const { buffer, contentType } = await this.storage.download(message.mediaUrl)
      return { buffer, mimetype: contentType }
    }

    // Fallback: proxy via Evolution API (stickers, mídias antigas, etc.)
    if (!message.evolutionId) {
      throw new AppException('MEDIA_NOT_AVAILABLE', 'Mensagem sem ID do Evolution')
    }

    const evolutionId = message.conversation.instance.evolutionId
    const media = await this.whatsapp.getMediaBase64(evolutionId, message.evolutionId)
    if (!media) {
      throw new AppException('MEDIA_DOWNLOAD_FAILED', 'Falha ao baixar midia do WhatsApp')
    }

    return { buffer: Buffer.from(media.base64, 'base64'), mimetype: media.mimetype }
  }

  async syncConversationMessages(tenantId: string, conversationId: string) {
    const conversation = await this.findConversationById(tenantId, conversationId)

    const contactPhone = conversation.contact.phone
    const evolutionId = conversation.instance.evolutionId
    const remoteJid = `${contactPhone}@s.whatsapp.net`

    let historyMessages: Awaited<ReturnType<WhatsAppService['findMessages']>>
    try {
      historyMessages = await this.whatsapp.findMessages(evolutionId, {
        remoteJid,
        limit: 20,
      })
    } catch (error) {
      this.logger.warn(
        `Sync failed for conversation ${conversationId}: ${(error as Error).message}`,
        'InboxService',
      )
      return { data: { synced: false, newMessages: 0 } }
    }

    if (historyMessages.length === 0) {
      return { data: { synced: true, newMessages: 0 } }
    }

    // Deduplicate: filter out messages already in DB
    const evolutionIds = historyMessages
      .map((m) => m.key.id)
      .filter((id): id is string => id != null)

    const existingIds = evolutionIds.length > 0
      ? await this.repository.findExistingEvolutionIds(evolutionIds)
      : new Set<string>()

    const newMessages = historyMessages.filter(
      (m) => m.key.id && !existingIds.has(m.key.id),
    )

    if (newMessages.length === 0) {
      return { data: { synced: true, newMessages: 0 } }
    }

    // Sort oldest first
    newMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)

    // Transform with parseWhatsAppMessage (same pattern as import)
    const messagesToCreate = newMessages.map((msg) => {
      const parsed = parseWhatsAppMessage(msg.message)
      return {
        tenantId,
        conversationId,
        fromMe: msg.key.fromMe,
        body: parsed.body,
        type: parsed.type as 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN',
        status: 'DELIVERED' as const,
        evolutionId: msg.key.id,
        mediaUrl: parsed.mediaUrl,
        sentAt: new Date(msg.messageTimestamp * 1000),
      }
    })

    await this.repository.createManyMessages(messagesToCreate)

    // Emit WebSocket for each new message so frontend updates in real-time
    for (const msg of messagesToCreate) {
      this.gateway.emitNewMessage(tenantId, {
        conversationId,
        message: {
          conversationId,
          fromMe: msg.fromMe,
          fromBot: false,
          body: msg.body,
          type: msg.type,
          status: msg.status,
          mediaUrl: msg.mediaUrl,
          evolutionId: msg.evolutionId,
          sentAt: msg.sentAt,
          createdAt: msg.sentAt,
        },
      })
    }

    // Update lastMessageAt if the latest synced message is newer
    const lastSynced = messagesToCreate[messagesToCreate.length - 1]
    if (lastSynced.sentAt > (conversation.lastMessageAt ?? new Date(0))) {
      await this.repository.updateLastMessageAt(conversationId)
    }

    this.logger.log(
      `Synced ${newMessages.length} messages for conversation ${conversationId}`,
      'InboxService',
    )

    return { data: { synced: true, newMessages: newMessages.length } }
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
