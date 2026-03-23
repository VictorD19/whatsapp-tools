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

  private static readonly CHAT_PAGE_SIZE = 100

  @Process({ name: 'import-chats', concurrency: 1 })
  async handleImportChats(job: Job<ImportChatsJobData>) {
    const { tenantId, instanceId, evolutionId, messageLimit } = job.data
    const progressKey = `${tenantId}:${instanceId}`
    const pageSize = ConversationImportProcessor.CHAT_PAGE_SIZE

    this.logger.log(
      `Starting paginated conversation import for instance ${instanceId}`,
      'ConversationImportProcessor',
    )

    // Fetch contacts upfront for name enrichment (lightweight call)
    const contactNameMap = new Map<string, string>()
    try {
      const contacts = await this.whatsapp.findContacts(evolutionId)
      for (const c of contacts) {
        if (c.pushName) {
          contactNameMap.set(c.remoteJid, c.pushName)
        }
      }
      this.logger.log(
        `Fetched ${contacts.length} contacts (${contactNameMap.size} with names) for name enrichment`,
        'ConversationImportProcessor',
      )
    } catch {
      this.logger.warn(
        'Failed to fetch contacts for name enrichment — continuing with chat names only',
        'ConversationImportProcessor',
      )
    }

    const seenJids = new Set<string>()
    let totalQueued = 0
    let skip = 0
    let pageNumber = 0
    let startedEmitted = false

    while (true) {
      // Fetch one page of chats
      let pageChats: Awaited<ReturnType<WhatsAppService['findChats']>>
      try {
        pageChats = await this.whatsapp.findChats(evolutionId, { take: pageSize, skip })
      } catch (error) {
        this.logger.error(
          `Failed to fetch chats page ${pageNumber} (skip=${skip}) for instance ${evolutionId}: ${(error as Error).message}`,
          (error as Error).stack,
          'ConversationImportProcessor',
        )
        // If first page fails, emit failure and abort
        if (!startedEmitted) {
          this.gateway.emitImportFailed(tenantId, {
            instanceId,
            reason: 'Falha ao buscar conversas do WhatsApp',
          })
          return
        }
        // If a later page fails, stop paginating but let queued conversations finish
        break
      }

      this.logger.log(
        `Page ${pageNumber}: fetched ${pageChats.length} chats (skip=${skip})`,
        'ConversationImportProcessor',
      )

      // Filter invalid chats
      const validPageChats = pageChats.filter((chat) => {
        const jid = chat.remoteJid
        if (jid.includes('status@broadcast')) return false
        if (jid.includes('@lid')) return false
        if (seenJids.has(jid)) return false
        seenJids.add(jid)
        return true
      })

      // Emit import:started on first page so the frontend gets immediate feedback
      if (!startedEmitted) {
        startedEmitted = true
        // We don't know the exact total yet — use page count as estimate, updated later
        this.gateway.emitImportStarted(tenantId, {
          instanceId,
          totalChats: validPageChats.length,
          jobId: job.id as string,
        })
        importProgress.set(progressKey, {
          imported: 0,
          skipped: 0,
          errors: 0,
          total: validPageChats.length,
        })
      }

      // Queue sub-jobs for each valid chat in this page
      for (const chat of validPageChats) {
        const enrichedName = chat.name || contactNameMap.get(chat.remoteJid) || undefined
        await this.importProducer.importConversation({
          tenantId,
          instanceId,
          evolutionId,
          remoteJid: chat.remoteJid,
          contactName: enrichedName,
          contactAvatarUrl: chat.profilePicUrl,
          messageLimit,
          index: totalQueued,
          total: 0, // updated after all pages loaded
        })
        totalQueued++
      }

      // If this page was smaller than pageSize, we've reached the end
      if (pageChats.length < pageSize) break
      skip += pageSize
      pageNumber++
    }

    // Now we know the real total — update progress and re-emit so frontend has accurate count
    const counter = importProgress.get(progressKey)
    if (counter) {
      counter.total = totalQueued
    }

    if (totalQueued === 0) {
      if (!startedEmitted) {
        this.gateway.emitImportStarted(tenantId, {
          instanceId,
          totalChats: 0,
          jobId: job.id as string,
        })
      }
      this.gateway.emitImportCompleted(tenantId, {
        instanceId,
        totalImported: 0,
        totalSkipped: 0,
        totalErrors: 0,
      })
      importProgress.delete(progressKey)
      return
    }

    // Emit updated total to frontend
    this.gateway.emitImportProgress(tenantId, {
      instanceId,
      imported: counter?.imported ?? 0,
      total: totalQueued,
      skipped: counter?.skipped ?? 0,
    })

    this.logger.log(
      `Queued ${totalQueued} conversations for import across ${pageNumber + 1} pages (instance ${instanceId})`,
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
      contactAvatarUrl,
      messageLimit,
    } = job.data
    const progressKey = `${tenantId}:${instanceId}`

    const isGroup = remoteJid.includes('@g.us')
    // For groups use full JID as identifier; for 1:1 use phone number
    const phone = isGroup ? remoteJid : remoteJid.split('@')[0]

    try {
      // Find or create contact — only pass real name, never phone as name
      const contact = await this.contactsService.findOrCreate(
        tenantId,
        phone,
        contactName || undefined,
      )

      // Update avatar if available and contact doesn't have one
      if (contactAvatarUrl && !contact.avatarUrl) {
        await this.contactsService.updateAvatarUrl(contact.id, contactAvatarUrl)
        contact.avatarUrl = contactAvatarUrl
      }

      // Idempotency: check if conversation already exists for this contact + instance
      const existing = await this.inboxRepository.findConversationByContactAndInstance(
        tenantId,
        instanceId,
        contact.id,
      )

      if (existing) {
        this.updateProgress(progressKey, 'skipped')
        this.emitProgress(tenantId, instanceId, progressKey)
        return
      }

      // Fetch messages from Evolution API
      const historyMessages = await this.whatsapp.findMessages(evolutionId, {
        remoteJid,
        limit: messageLimit,
      })

      if (historyMessages.length === 0) {
        this.updateProgress(progressKey, 'skipped')
        this.emitProgress(tenantId, instanceId, progressKey)
        return
      }

      // Deduplicate: filter out messages that already exist by evolutionId
      const evolutionIds = historyMessages
        .map((m) => m.key.id)
        .filter((id): id is string => id != null)

      const existingMsgIds = evolutionIds.length > 0
        ? await this.inboxRepository.findExistingEvolutionIds(evolutionIds)
        : new Set<string>()

      const newMessages = historyMessages.filter(
        (m) => m.key.id && !existingMsgIds.has(m.key.id),
      )

      if (newMessages.length === 0) {
        this.updateProgress(progressKey, 'skipped')
        this.emitProgress(tenantId, instanceId, progressKey)
        return
      }

      // Enrich contact name from message pushName if still unnamed
      if (!contact.name && !isGroup) {
        const msgPushName = newMessages.find(
          (m) => !m.key.fromMe && m.pushName,
        )?.pushName
        if (msgPushName) {
          await this.contactsService.findOrCreate(tenantId, phone, msgPushName)
          contact.name = msgPushName
        }
      }

      // Sort messages by timestamp ascending (oldest first)
      newMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp)

      // Determine last message timestamp for lastMessageAt
      const lastMsg = newMessages[newMessages.length - 1]
      const lastMessageAt = new Date(lastMsg.messageTimestamp * 1000)

      // Count inbound messages for unreadCount
      const inboundCount = newMessages.filter((m) => !m.key.fromMe).length

      // Double-check idempotency right before creation (prevents race condition with concurrent jobs)
      const existingBeforeCreate = await this.inboxRepository.findConversationByContactAndInstance(
        tenantId,
        instanceId,
        contact.id,
      )
      if (existingBeforeCreate) {
        this.updateProgress(progressKey, 'skipped')
        this.emitProgress(tenantId, instanceId, progressKey)
        return
      }

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
      const typeCounts: Record<string, number> = {}
      const messagesToCreate = newMessages.map((msg) => {
        const parsed = parseWhatsAppMessage(msg.message)

        // Track type distribution for diagnostics
        typeCounts[parsed.type] = (typeCounts[parsed.type] || 0) + 1

        return {
          tenantId,
          conversationId: conversation.id,
          fromMe: msg.key.fromMe,
          body: parsed.body,
          type: parsed.type as 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN',
          status: 'DELIVERED' as const,
          evolutionId: msg.key.id,
          mediaUrl: parsed.mediaUrl,
          sentAt: new Date(msg.messageTimestamp * 1000),
        }
      })

      await this.inboxRepository.createManyMessages(messagesToCreate)

      this.updateProgress(progressKey, 'imported')
      this.emitProgress(tenantId, instanceId, progressKey)

      this.logger.debug(
        `Imported conversation with ${phone}: ${messagesToCreate.length} messages — types: ${JSON.stringify(typeCounts)}`,
        'ConversationImportProcessor',
      )
    } catch (error) {
      this.logger.error(
        `Failed to import conversation with ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
        'ConversationImportProcessor',
      )
      this.updateProgress(progressKey, 'errors')
      this.emitProgress(tenantId, instanceId, progressKey)
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

    // Check if all conversations are processed (only when total is known > 0)
    if (counter.total > 0 && processed >= counter.total) {
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
