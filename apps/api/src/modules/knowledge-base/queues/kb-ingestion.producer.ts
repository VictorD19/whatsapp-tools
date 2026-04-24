import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface KbIngestionJobData {
  sourceId: string
  tenantId: string
}

@Injectable()
export class KbIngestionProducer {
  constructor(@InjectQueue(QUEUES.KB_INGESTION) private readonly queue: Queue) {}

  async enqueue(data: KbIngestionJobData) {
    await this.queue.add('ingest-source', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 5000,
      removeOnFail: 3600000,
    })
  }
}
