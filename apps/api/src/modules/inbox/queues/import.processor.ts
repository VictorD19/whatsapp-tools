import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { InboxRepository } from '../inbox.repository'
import { InboxGateway } from '../inbox.gateway'
import { ContactsService } from '@modules/contacts/contacts.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { TenantsService } from '@modules/tenants/tenants.service'
import { parseWhatsAppMessage } from '../utils/message-parser'
import { ConversationImportProducer, type ImportChatsJobData, type ImportConversationJobData } from './import.producer'

interface ImportCounter {
  imported: number
  skipped: number
  errors: number
  total: number
}

// In-memory progress tracking (per tenantId:instanceId)
const importProgress = new Map<string, ImportCounter>()

@Processor(QUEUES.CONVERSATION_IMPORT)
export class ConversationImportProcessor {
  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly contactsService: ContactsService,
    private readonly whatsapp: WhatsAppService,
    private readonly tenantsService: TenantsService,
    private readonly gateway: InboxGateway,
    private readonly importProducer: ConversationImportProducer,
    private readonly logger: LoggerService,
  ) {}

  @Process({ name: 'import-chats', concurrency: 2 })
  async handleImportChats(job: Job<ImportChatsJobData>) {
    const { tenantId, instanceId, evolutionId, messageLimit } = job.data
    const progressKey = `${tenantId}:${instanceId}`

    this.logger.log(
      `Starting conversation import for instance ${instanceId}`,
      'ConversationImportProcessor',
    )

    let chats: Awaited<ReturnType<WhatsAppService['findChats']>>
    try {
      chats = await this.whatsapp.findChats(evolutionId)
    } catch (error) {
      this.logger.error(
        `Failed to fetch chats for instance ${evolutionId}: ${(error as Error).message}`,
        (error as Error).stack,
        'ConversationImportProcessor',
      )
      this.gateway.emitImportFailed(tenantId, {
        instanceId,
        reason: 'Falha ao buscar conversas do WhatsApp',
      })
      return
    }

    // Filter out groups — only 1:1 conversations
    const individualChats = chats.filter((chat) => !chat.isGroup)

    if (individualChats.length === 0) {
      this.gateway.emitImportCompleted(tenantId, {
        instanceId,
        totalImported: 0,
        totalSkipped: 0,
        totalErrors: 0,
      })
      return
    }

    // Initialize progress counter
    importProgress.set(progressKey, {
      imported: 0,
      skipped: 0,
      errors: 0,
      total: individualChats.length,
    })

    // Emit import:started
    this.gateway.emitImportStarted(tenantId, {
      instanceId,
      totalChats: individualChats.length,
      jobId: job.id as string,
    })

    // Create sub-jobs for each conversation
    for (let i = 0; i < individualChats.length; i++) {
      const chat = individualChats[i]
      await this.importProducer.importConversation({
        tenantId,
        instanceId,
        evolutionId,
        remoteJid: chat.remoteJid,
        contactName: chat.name,
        messageLimit,
        index: i,
        total: individualChats.length,
      })
    }

    this.logger.log(
      `Queued ${individualChats.length} conversations for import (instance ${instanceId})`,
      'ConversationImportProcessor',
    )
  }

  @Process({ name: 'import-conversation', concurrency: 5 })
  async handleImportConversation(job: Job<ImportConversationJobData>) {
    const {
      tenantId,
      instanceId,
      evolutionId,
      remoteJid,
      contactName,
      messageLimit,
      total,
    } = job.data
    const progressKey = `${tenantId}:${instanceId}`

    const phone = remoteJid.split('@')[0]

    try {
      // Find or create contact
      const contact = await this.contactsService.findOrCreate(
        tenantId,
        phone,
        contactName,
      )

      // Idempotency: check if conversation already exists for this contact + instance
      const existing = await this.inboxRepository.findConversationByContactAndInstance(
        tenantId,
        instanceId,
        contact.id,
      )

      if (existing) {
        this.updateProgress(progressKey, 'skipped')
        this.emitProgress(tenantId, instanceId, progressKey, total)
        return
      }

      // Fetch messages from Evolution API
      const historyMessages = await this.whatsapp.findMessages(evolutionId, {
        remoteJid,
        limit: messageLimit,
      })

      if (historyMessages.length === 0) {
        this.updateProgress(progressKey, 'skipped')
        this.emitProgress(tenantId, instanceId, progressKey, total)
        return
      }

      // Sort messages by timestamp ascending (oldest first)
      historyMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)

      // Determine last message timestamp for lastMessageAt
      const lastMsg = historyMessages[historyMessages.length - 1]
      const lastMessageAt = new Date(lastMsg.messageTimestamp * 1000)

      // Count inbound messages for unreadCount
      const inboundCount = historyMessages.filter((m) => !m.key.fromMe).length

      // Create conversation
      const protocol = await this.tenantsService.getNextProtocol(tenantId)
      const conversation = await this.inboxRepository.createConversationForImport({
        tenantId,
        instanceId,
        contactId: contact.id,
        protocol,
        lastMessageAt,
        unreadCount: inboundCount,
      })

      // Build messages for bulk insert
      const messagesToCreate = historyMessages.map((msg) => {
        const parsed = parseWhatsAppMessage(msg.message)
        return {
          tenantId,
          conversationId: conversation.id,
          fromMe: msg.key.fromMe,
          body: parsed.body,
          type: parsed.type as 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'UNKNOWN',
          status: msg.key.fromMe ? ('DELIVERED' as const) : ('DELIVERED' as const),
          evolutionId: msg.key.id,
          mediaUrl: parsed.mediaUrl,
          sentAt: new Date(msg.messageTimestamp * 1000),
        }
      })

      await this.inboxRepository.createManyMessages(messagesToCreate)

      this.updateProgress(progressKey, 'imported')
      this.emitProgress(tenantId, instanceId, progressKey, total)

      this.logger.debug(
        `Imported conversation with ${phone}: ${messagesToCreate.length} messages`,
        'ConversationImportProcessor',
      )
    } catch (error) {
      this.logger.error(
        `Failed to import conversation with ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
        'ConversationImportProcessor',
      )
      this.updateProgress(progressKey, 'errors')
      this.emitProgress(tenantId, instanceId, progressKey, total)
    }
  }

  private updateProgress(
    key: string,
    field: 'imported' | 'skipped' | 'errors',
  ) {
    const counter = importProgress.get(key)
    if (counter) {
      counter[field]++
    }
  }

  private emitProgress(
    tenantId: string,
    instanceId: string,
    progressKey: string,
    total: number,
  ) {
    const counter = importProgress.get(progressKey)
    if (!counter) return

    const processed = counter.imported + counter.skipped + counter.errors

    this.gateway.emitImportProgress(tenantId, {
      instanceId,
      imported: counter.imported,
      total: counter.total,
      skipped: counter.skipped,
    })

    // Check if all conversations are processed
    if (processed >= total) {
      this.gateway.emitImportCompleted(tenantId, {
        instanceId,
        totalImported: counter.imported,
        totalSkipped: counter.skipped,
        totalErrors: counter.errors,
      })
      importProgress.delete(progressKey)

      this.logger.log(
        `Import completed for instance ${instanceId}: ${counter.imported} imported, ${counter.skipped} skipped, ${counter.errors} errors`,
        'ConversationImportProcessor',
      )
    }
  }
}
