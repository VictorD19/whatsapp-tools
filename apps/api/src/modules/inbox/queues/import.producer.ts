import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface ImportChatsJobData {
  tenantId: string
  instanceId: string
  evolutionId: string
  messageLimit: number
}

export interface ImportConversationJobData {
  tenantId: string
  instanceId: string
  evolutionId: string
  remoteJid: string
  contactName?: string
  messageLimit: number
  index: number
  total: number
}

@Injectable()
export class ConversationImportProducer {
  constructor(
    @InjectQueue(QUEUES.CONVERSATION_IMPORT)
    private readonly queue: Queue,
  ) {}

  async startImport(payload: ImportChatsJobData) {
    return this.queue.add('import-chats', payload, {
      jobId: `import-${payload.tenantId}-${payload.instanceId}`,
      attempts: 1,
      removeOnComplete: true,
    })
  }

  async importConversation(payload: ImportConversationJobData) {
    return this.queue.add('import-conversation', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    })
  }
}
