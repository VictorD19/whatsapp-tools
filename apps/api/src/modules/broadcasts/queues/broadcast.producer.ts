import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'

export interface BroadcastJobData {
  broadcastId: string
  tenantId: string
}

@Injectable()
export class BroadcastProducer {
  constructor(
    @InjectQueue(QUEUES.BROADCAST)
    private readonly queue: Queue,
    private readonly logger: LoggerService,
  ) {}

  async enqueue(broadcastId: string, tenantId: string, delayMs?: number) {
    const job = await this.queue.add(
      'send-broadcast',
      { broadcastId, tenantId } satisfies BroadcastJobData,
      {
        jobId: `broadcast-${broadcastId}`,
        delay: delayMs ?? 0,
        attempts: 1,
        removeOnComplete: true,
      },
    )
    this.logger.log(
      `Broadcast job enqueued: ${job.id}, delay=${delayMs ?? 0}ms`,
      'BroadcastProducer',
    )
    return job
  }

  async removeJob(broadcastId: string) {
    const job = await this.queue.getJob(`broadcast-${broadcastId}`)
    if (job) {
      await job.remove()
    }
  }
}
