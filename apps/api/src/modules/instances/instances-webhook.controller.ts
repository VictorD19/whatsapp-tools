import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { Public } from '@shared/decorators/current-user.decorator'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'

// Events that belong to instance lifecycle
const INSTANCE_EVENTS = new Set(['connection.update', 'qrcode.updated'])

// Events that belong to inbox/messages
const INBOX_EVENTS = new Set(['messages.upsert', 'messages.update'])

interface WebhookJob {
  instanceName: string
  event: string
  data: Record<string, unknown>
  receivedAt: string
}

@Controller('webhooks/evolution')
export class InstancesWebhookController {
  constructor(
    @InjectQueue(QUEUES.WEBHOOK_INBOUND)
    private readonly webhookQueue: Queue<WebhookJob>,
    private readonly logger: LoggerService,
  ) {}

  @Public()
  @Post(':evolutionId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('evolutionId') evolutionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const event = body.event as string | undefined

    if (!event) {
      this.logger.warn(`Webhook received without event field for ${evolutionId}`, 'Webhook')
      return { received: true }
    }

    this.logger.debug(
      `Webhook received: ${event} for ${evolutionId}`,
      'Webhook',
    )

    const job: WebhookJob = {
      instanceName: evolutionId,
      event,
      data: body.data as Record<string, unknown> ?? body,
      receivedAt: new Date().toISOString(),
    }

    // Route to appropriate processor job name
    if (INSTANCE_EVENTS.has(event)) {
      await this.webhookQueue.add('instance-webhook', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      })
    } else if (INBOX_EVENTS.has(event)) {
      await this.webhookQueue.add('inbox-webhook', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      })
    } else {
      this.logger.debug(`Unrouted webhook event: ${event}`, 'Webhook')
    }

    return { received: true }
  }
}
