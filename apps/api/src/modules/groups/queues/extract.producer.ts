import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface ExtractContactsJobData {
  tenantId: string
  instanceId: string
  evolutionId: string
  groupIds: string[]
  createList?: {
    name: string
    description?: string
  }
}

@Injectable()
export class GroupExtractProducer {
  constructor(
    @InjectQueue(QUEUES.GROUP_CONTACT_EXTRACT)
    private readonly queue: Queue,
  ) {}

  async startExtraction(payload: ExtractContactsJobData) {
    return this.queue.add('extract-contacts', payload, {
      jobId: `extract-${payload.tenantId}-${payload.instanceId}-${Date.now()}`,
      attempts: 1,
      removeOnComplete: true,
    })
  }
}
