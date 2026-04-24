import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface InboxWebhookJobData {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Injectable()
export class WebhookInboundProducer {
  constructor(
    @InjectQueue(QUEUES.WEBHOOK_INBOUND)
    private readonly queue: Queue<InboxWebhookJobData>,
  ) {}

  async publishInboundWebhook(payload: InboxWebhookJobData) {
    return this.queue.add('inbox-webhook', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 5000,
      removeOnFail: 3600000,
    })
  }
}
