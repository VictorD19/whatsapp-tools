import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'

export const QUEUES = {
  BROADCAST: 'broadcast',
  GROUP_MENTION: 'group-mention',
  AI_RESPONSE: 'ai-response',
  WEBHOOK_INBOUND: 'webhook-inbound',
  WEBHOOK_INSTANCE: 'webhook-instance',
  NOTIFICATION: 'notification',
  CONVERSATION_IMPORT: 'conversation-import',
  GROUP_CONTACT_EXTRACT: 'group-contact-extract',
  KB_INGESTION: 'kb-ingestion',
  FOLLOW_UP_SCHEDULER: 'follow-up-scheduler',
} as const

function parseRedisConfig() {
  const url = process.env.REDIS_URL
  if (url) {
    try {
      const parsed = new URL(url)
      return {
        host: parsed.hostname || 'localhost',
        port: parseInt(parsed.port || '6379'),
      }
    } catch {
      // fallback to host/port
    }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
}

@Module({
  imports: [
    BullModule.forRoot({
      redis: parseRedisConfig(),
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
