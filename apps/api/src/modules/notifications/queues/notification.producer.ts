import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { CreateNotificationData } from '../notifications.repository'

@Injectable()
export class NotificationProducer {
  constructor(
    @InjectQueue(QUEUES.NOTIFICATION)
    private readonly queue: Queue,
  ) {}

  async enqueue(data: CreateNotificationData) {
    return this.queue.add('create-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 5000,
      removeOnFail: 3600000,
    })
  }
}
