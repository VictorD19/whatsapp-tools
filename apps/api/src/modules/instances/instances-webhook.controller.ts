import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { Public } from '@shared/decorators/current-user.decorator'
import { InstanceWebhookProducer, InstanceWebhookJob } from './queues/instance-webhook.producer'
import { LoggerService } from '@core/logger/logger.service'

@Controller('webhooks/evolution')
export class InstancesWebhookController {
  constructor(
    private readonly webhookProducer: InstanceWebhookProducer,
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

    const job: InstanceWebhookJob = {
      instanceName: evolutionId,
      event,
      data: body.data as Record<string, unknown> ?? body,
      receivedAt: new Date().toISOString(),
    }

    await this.webhookProducer.enqueue(job)

    return { received: true }
  }
}
