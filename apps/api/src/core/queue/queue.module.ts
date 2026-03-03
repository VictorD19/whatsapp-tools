import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'

export const QUEUES = {
  BROADCAST: 'broadcast',
  GROUP_MENTION: 'group-mention',
  AI_RESPONSE: 'ai-response',
  WEBHOOK_INBOUND: 'webhook-inbound',
  NOTIFICATION: 'notification',
} as const

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
