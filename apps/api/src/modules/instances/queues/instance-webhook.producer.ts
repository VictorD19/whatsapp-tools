import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface InstanceWebhookJob {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Injectable()
export class InstanceWebhookProducer {
  constructor(
    @InjectQueue(QUEUES.WEBHOOK_INBOUND)
    private readonly webhookQueue: Queue<InstanceWebhookJob>,
  ) {}

  async enqueue(job: InstanceWebhookJob) {
    await this.webhookQueue.add('instance-webhook', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    })
  }
}
