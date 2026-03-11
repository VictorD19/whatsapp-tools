import { Injectable, OnModuleInit } from '@nestjs/common'
import * as webpush from 'web-push'
import { PrismaService } from '@core/database/prisma.service'
import { LoggerService } from '@core/logger/logger.service'

export interface PushSubscriptionDto {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}

@Injectable()
export class PushService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const email = process.env.VAPID_EMAIL ?? 'mailto:admin@sistemazapchat.com'

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not configured — push notifications disabled', 'PushService')
      return
    }

    webpush.setVapidDetails(email, publicKey, privateKey)
    this.logger.log('VAPID keys configured', 'PushService')
  }

  async saveSubscription(userId: string, dto: PushSubscriptionDto) {
    return this.prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: dto.endpoint } },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
      },
      update: {
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
      },
    })
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    })
  }

  async sendToUser(userId: string, payload: { title: string; body: string; data?: Record<string, unknown> }) {
    if (!process.env.VAPID_PUBLIC_KEY) return

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    })

    if (!subscriptions.length) return

    const message = JSON.stringify(payload)

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            message,
          )
        } catch (error: unknown) {
          const err = error as { statusCode?: number; message?: string }
          // 404/410 = subscription inválida — remover do banco
          if (err.statusCode === 404 || err.statusCode === 410) {
            this.logger.debug(`Removing stale push subscription for user ${userId}`, 'PushService')
            await this.prisma.pushSubscription.deleteMany({
              where: { userId, endpoint: sub.endpoint },
            })
          } else {
            this.logger.warn(
              `Push failed for user ${userId}: ${err.message}`,
              'PushService',
            )
          }
        }
      }),
    )
  }
}
