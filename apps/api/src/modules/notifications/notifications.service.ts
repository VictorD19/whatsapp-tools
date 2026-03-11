import { Injectable } from '@nestjs/common'
import { NotificationsRepository, CreateNotificationData } from './notifications.repository'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationProducer } from './queues/notification.producer'
import { PushService, PushSubscriptionDto } from './push.service'
import { NotificationFiltersDto } from './dto/notification-filters.dto'
import { UpdatePreferenceDto } from './dto/update-preference.dto'
import { NotificationType } from '@prisma/client'
import { AppException } from '@core/errors/app.exception'

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly gateway: NotificationsGateway,
    private readonly producer: NotificationProducer,
    private readonly push: PushService,
  ) {}

  async dispatch(data: CreateNotificationData) {
    await this.producer.enqueue(data)
  }

  async createAndEmit(data: CreateNotificationData) {
    const pref = await this.repository.findPreference(data.userId, data.type)
    const inApp = pref?.inApp ?? true
    const browser = pref?.browser ?? false

    // Só ignora se ambos estiverem desativados
    if (!inApp && !browser) return null

    let notification = null

    if (inApp) {
      notification = await this.repository.create(data)
      const unreadCount = await this.repository.countUnread(data.userId)
      this.gateway.emitNotification(data.userId, { notification, unreadCount })
    }

    if (browser) {
      await this.push.sendToUser(data.userId, {
        title: data.title,
        body: data.body,
        data: data.data,
      })
    }

    return notification
  }

  async savePushSubscription(userId: string, dto: PushSubscriptionDto) {
    return this.push.saveSubscription(userId, dto)
  }

  async removePushSubscription(userId: string, endpoint: string) {
    return this.push.removeSubscription(userId, endpoint)
  }

  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null }
  }

  async findByUser(userId: string, filters: NotificationFiltersDto) {
    const { notifications, total } = await this.repository.findByUser(
      userId,
      filters.page,
      filters.limit,
    )

    const unreadCount = await this.repository.countUnread(userId)

    return {
      data: notifications,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        unreadCount,
      },
    }
  }

  async markAsRead(userId: string, id: string) {
    const result = await this.repository.markAsRead(userId, id)
    if (result.count === 0) {
      throw AppException.notFound('NOTIFICATION_NOT_FOUND', 'Notificação não encontrada', { id })
    }
    const unreadCount = await this.repository.countUnread(userId)
    this.gateway.emitUnreadCount(userId, unreadCount)
    return { data: { success: true } }
  }

  async markAllAsRead(userId: string) {
    await this.repository.markAllAsRead(userId)
    this.gateway.emitUnreadCount(userId, 0)
    return { data: { success: true } }
  }

  async getPreferences(userId: string) {
    const prefs = await this.repository.findPreferences(userId)
    // Fill in defaults for types not yet persisted
    const allTypes = Object.values(NotificationType)
    const map = new Map(prefs.map((p) => [p.type, p]))
    const result = allTypes.map((type) => ({
      type,
      inApp: map.get(type)?.inApp ?? true,
      browser: map.get(type)?.browser ?? false,
    }))
    return { data: result }
  }

  async updatePreference(userId: string, type: NotificationType, dto: UpdatePreferenceDto) {
    const updated = await this.repository.upsertPreference(userId, type, dto.inApp, dto.browser)
    return { data: updated }
  }

  async getUnreadCount(userId: string) {
    const count = await this.repository.countUnread(userId)
    return { data: { count } }
  }
}
