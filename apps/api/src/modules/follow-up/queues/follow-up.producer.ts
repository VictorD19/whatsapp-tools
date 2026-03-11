import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface FollowUpJobData {
  followUpId: string
}

@Injectable()
export class FollowUpProducer {
  constructor(
    @InjectQueue(QUEUES.FOLLOW_UP_SCHEDULER)
    private readonly queue: Queue<FollowUpJobData>,
  ) {}

  async schedule(followUpId: string, scheduledAt: Date) {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now())

    return this.queue.add('process-follow-up', { followUpId }, {
      jobId: followUpId,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    })
  }

  async cancel(followUpId: string) {
    const job = await this.queue.getJob(followUpId)
    if (job) {
      const state = await job.getState()
      if (state === 'delayed' || state === 'waiting') {
        await job.remove()
      }
    }
  }
}
