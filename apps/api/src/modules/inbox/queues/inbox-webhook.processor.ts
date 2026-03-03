import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { InboxRepository } from '../inbox.repository'
import { InboxGateway } from '../inbox.gateway'
import { ContactsService } from '@modules/contacts/contacts.service'
import { InstancesService } from '@modules/instances/instances.service'
interface InboxWebhookJob {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Processor(QUEUES.WEBHOOK_INBOUND)
export class InboxWebhookProcessor {
  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly contactsService: ContactsService,
    private readonly instancesService: InstancesService,
    private readonly gateway: InboxGateway,
    private readonly logger: LoggerService,
  ) {}

  @Process('inbox-webhook')
  async handleInboxWebhook(job: Job<InboxWebhookJob>) {
    const { instanceName, event, data } = job.data

    this.logger.debug(
      `Processing inbox webhook: ${event} for ${instanceName}`,
      'InboxWebhookProcessor',
    )

    const instance = await this.instancesService.findByEvolutionId(instanceName)
    if (!instance) {
      this.logger.warn(
        `Instance not found for evolutionId: ${instanceName}`,
        'InboxWebhookProcessor',
      )
      return
    }

    switch (event) {
      case 'messages.upsert': {
        await this.handleMessageReceived(instance, data)
        break
      }
      case 'messages.update': {
        await this.handleMessageStatusUpdate(instance, data)
        break
      }
      default: {
        this.logger.debug(
          `Unhandled inbox webhook event: ${event}`,
          'InboxWebhookProcessor',
        )
      }
    }
  }

  private async handleMessageReceived(
    instance: { id: string; tenantId: string },
    data: Record<string, unknown>,
  ) {
    // Evolution sends messages array
    const messages = Array.isArray(data) ? data : (data.messages as Array<Record<string, unknown>> ?? [data])

    for (const msg of messages) {
      const key = msg.key as Record<string, unknown> | undefined
      if (!key) continue

      // Skip messages sent by us
      const fromMe = key.fromMe as boolean
      if (fromMe) continue

      const remoteJid = key.remoteJid as string | undefined
      if (!remoteJid) continue

      // Skip group messages for now (inbox is 1:1)
      if (remoteJid.includes('@g.us')) continue

      // Extract phone number from JID
      const phone = remoteJid.split('@')[0]
      const pushName = msg.pushName as string | undefined

      // Extract message body
      const message = msg.message as Record<string, unknown> | undefined
      let body: string | null = null
      let type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'UNKNOWN' = 'TEXT'
      let mediaUrl: string | undefined

      if (message) {
        if (message.conversation) {
          body = message.conversation as string
        } else if (message.extendedTextMessage) {
          body = (message.extendedTextMessage as Record<string, unknown>).text as string
        } else if (message.imageMessage) {
          type = 'IMAGE'
          body = (message.imageMessage as Record<string, unknown>).caption as string ?? null
          mediaUrl = (message.imageMessage as Record<string, unknown>).url as string
        } else if (message.videoMessage) {
          type = 'VIDEO'
          body = (message.videoMessage as Record<string, unknown>).caption as string ?? null
          mediaUrl = (message.videoMessage as Record<string, unknown>).url as string
        } else if (message.audioMessage) {
          type = 'AUDIO'
          mediaUrl = (message.audioMessage as Record<string, unknown>).url as string
        } else if (message.documentMessage) {
          type = 'DOCUMENT'
          body = (message.documentMessage as Record<string, unknown>).fileName as string ?? null
          mediaUrl = (message.documentMessage as Record<string, unknown>).url as string
        } else {
          type = 'UNKNOWN'
        }
      }

      // Find or create contact
      const contact = await this.contactsService.findOrCreate(
        instance.tenantId,
        phone,
        pushName,
      )

      // Find active conversation or create new one
      let conversation = await this.inboxRepository.findActiveConversation(
        instance.tenantId,
        instance.id,
        contact.id,
      )

      const now = new Date()
      let isNewConversation = false

      if (!conversation) {
        conversation = await this.inboxRepository.createConversation({
          tenantId: instance.tenantId,
          instanceId: instance.id,
          contactId: contact.id,
          lastMessageAt: now,
        })
        isNewConversation = true
      } else {
        await this.inboxRepository.incrementUnreadCount(conversation.id)
      }

      // Create message
      const evolutionMsgId = key.id as string | undefined
      const newMessage = await this.inboxRepository.createMessage({
        tenantId: instance.tenantId,
        conversationId: conversation.id,
        fromMe: false,
        body,
        type,
        status: 'DELIVERED',
        evolutionId: evolutionMsgId,
        mediaUrl,
      })

      // Emit WebSocket events
      if (isNewConversation) {
        this.gateway.emitConversationCreated(instance.tenantId, {
          conversationId: conversation.id,
          instanceId: instance.id,
          contactId: contact.id,
          contactPhone: contact.phone,
          contactName: contact.name,
        })
      }

      this.gateway.emitNewMessage(instance.tenantId, {
        conversationId: conversation.id,
        message: {
          id: newMessage.id,
          fromMe: false,
          body: newMessage.body,
          type: newMessage.type,
          mediaUrl: newMessage.mediaUrl,
          sentAt: newMessage.sentAt,
        },
      })

      this.logger.log(
        `New message in conversation ${conversation.id} from ${phone}`,
        'InboxWebhookProcessor',
      )
    }
  }

  private async handleMessageStatusUpdate(
    instance: { id: string; tenantId: string },
    data: Record<string, unknown>,
  ) {
    const updates = Array.isArray(data) ? data : [data]

    for (const update of updates) {
      const key = update.key as Record<string, unknown> | undefined
      const evolutionId = key?.id as string | undefined
      if (!evolutionId) continue

      const statusNum = update.status as number | undefined
      const statusMap: Record<number, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
        1: 'SENT',
        2: 'DELIVERED',
        3: 'READ',
        4: 'FAILED',
        5: 'READ',
      }

      const status = statusNum ? statusMap[statusNum] : undefined
      if (!status) continue

      const updated = await this.inboxRepository.updateMessageStatusByEvolutionId(
        evolutionId,
        status,
      )

      if (updated) {
        this.gateway.emitMessageStatusUpdated(instance.tenantId, {
          messageId: updated.id,
          conversationId: updated.conversationId,
          status,
        })
      }
    }
  }
}
