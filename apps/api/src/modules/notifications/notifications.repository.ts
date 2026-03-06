import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { NotificationType } from '@prisma/client'

export interface CreateNotificationData {
  tenantId: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData) {
    return this.prisma.notification.create({ data })
  }

  async findByUser(userId: string, page: number, limit: number) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ])
    return { notifications, total }
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } })
  }

  async markAsRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { userId, id },
      data: { read: true, readAt: new Date() },
    })
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    })
  }

  async findPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } })
  }

  async upsertPreference(userId: string, type: NotificationType, inApp: boolean, browser: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, inApp, browser },
      update: { inApp, browser },
    })
  }

  async findPreference(userId: string, type: NotificationType) {
    return this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    })
  }
}
