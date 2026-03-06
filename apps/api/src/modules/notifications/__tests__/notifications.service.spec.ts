import { Test } from '@nestjs/testing'
import { createMock } from '@golevelup/ts-jest'
import { NotificationsService } from '../notifications.service'
import { NotificationsRepository } from '../notifications.repository'
import { NotificationsGateway } from '../notifications.gateway'
import { NotificationProducer } from '../queues/notification.producer'
import { NotificationType } from '@prisma/client'
import { AppException } from '@core/errors/app.exception'

describe('NotificationsService', () => {
  let service: NotificationsService
  let repository: jest.Mocked<NotificationsRepository>
  let gateway: jest.Mocked<NotificationsGateway>
  let producer: jest.Mocked<NotificationProducer>

  const userId = 'user-123'
  const tenantId = 'tenant-456'

  const mockNotification = {
    id: 'notif-1',
    tenantId,
    userId,
    type: NotificationType.NEW_MESSAGE,
    title: 'Nova mensagem',
    body: 'Você tem uma nova mensagem',
    data: null,
    read: false,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockCreateData = {
    tenantId,
    userId,
    type: NotificationType.NEW_MESSAGE,
    title: 'Nova mensagem',
    body: 'Você tem uma nova mensagem',
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: createMock<NotificationsRepository>() },
        { provide: NotificationsGateway, useValue: createMock<NotificationsGateway>() },
        { provide: NotificationProducer, useValue: createMock<NotificationProducer>() },
      ],
    }).compile()

    service = module.get(NotificationsService)
    repository = module.get(NotificationsRepository)
    gateway = module.get(NotificationsGateway)
    producer = module.get(NotificationProducer)
  })

  describe('dispatch', () => {
    it('should call producer.enqueue with the correct data', async () => {
      producer.enqueue.mockResolvedValue({} as never)

      await service.dispatch(mockCreateData)

      expect(producer.enqueue).toHaveBeenCalledWith(mockCreateData)
      expect(producer.enqueue).toHaveBeenCalledTimes(1)
    })
  })

  describe('createAndEmit', () => {
    it('should create notification and emit gateway when inApp preference is true', async () => {
      repository.findPreference.mockResolvedValue({ inApp: true, browser: false } as never)
      repository.create.mockResolvedValue(mockNotification)
      repository.countUnread.mockResolvedValue(3)

      const result = await service.createAndEmit(mockCreateData)

      expect(repository.create).toHaveBeenCalledWith(mockCreateData)
      expect(repository.countUnread).toHaveBeenCalledWith(userId)
      expect(gateway.emitNotification).toHaveBeenCalledWith(userId, {
        notification: mockNotification,
        unreadCount: 3,
      })
      expect(result).toEqual(mockNotification)
    })

    it('should create notification and emit gateway when no preference exists (default inApp=true)', async () => {
      repository.findPreference.mockResolvedValue(null)
      repository.create.mockResolvedValue(mockNotification)
      repository.countUnread.mockResolvedValue(1)

      const result = await service.createAndEmit(mockCreateData)

      expect(repository.create).toHaveBeenCalledWith(mockCreateData)
      expect(gateway.emitNotification).toHaveBeenCalled()
      expect(result).toEqual(mockNotification)
    })

    it('should return null and not create when inApp preference is false', async () => {
      repository.findPreference.mockResolvedValue({ inApp: false, browser: false } as never)

      const result = await service.createAndEmit(mockCreateData)

      expect(repository.create).not.toHaveBeenCalled()
      expect(gateway.emitNotification).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('findByUser', () => {
    it('should return data with notifications and meta with unreadCount', async () => {
      repository.findByUser.mockResolvedValue({
        notifications: [mockNotification],
        total: 1,
      })
      repository.countUnread.mockResolvedValue(2)

      const result = await service.findByUser(userId, { page: 1, limit: 20 })

      expect(result.data).toEqual([mockNotification])
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
      expect(result.meta.unreadCount).toBe(2)
      expect(repository.findByUser).toHaveBeenCalledWith(userId, 1, 20)
      expect(repository.countUnread).toHaveBeenCalledWith(userId)
    })

    it('should calculate totalPages correctly', async () => {
      repository.findByUser.mockResolvedValue({
        notifications: [],
        total: 45,
      })
      repository.countUnread.mockResolvedValue(0)

      const result = await service.findByUser(userId, { page: 2, limit: 20 })

      expect(result.meta.totalPages).toBe(3)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read and emit unreadCount', async () => {
      repository.markAsRead.mockResolvedValue({ count: 1 })
      repository.countUnread.mockResolvedValue(4)

      const result = await service.markAsRead(userId, 'notif-1')

      expect(repository.markAsRead).toHaveBeenCalledWith(userId, 'notif-1')
      expect(repository.countUnread).toHaveBeenCalledWith(userId)
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(userId, 4)
      expect(result).toEqual({ data: { success: true } })
    })

    it('should throw NOTIFICATION_NOT_FOUND when count is 0', async () => {
      repository.markAsRead.mockResolvedValue({ count: 0 })

      await expect(service.markAsRead(userId, 'nonexistent')).rejects.toMatchObject({
        code: 'NOTIFICATION_NOT_FOUND',
      })

      expect(repository.countUnread).not.toHaveBeenCalled()
      expect(gateway.emitUnreadCount).not.toHaveBeenCalled()
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all as read and emit unreadCount=0', async () => {
      repository.markAllAsRead.mockResolvedValue({} as never)

      const result = await service.markAllAsRead(userId)

      expect(repository.markAllAsRead).toHaveBeenCalledWith(userId)
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(userId, 0)
      expect(result).toEqual({ data: { success: true } })
    })
  })

  describe('getPreferences', () => {
    it('should fill defaults for all NotificationType values when none persisted', async () => {
      repository.findPreferences.mockResolvedValue([])

      const result = await service.getPreferences(userId)

      const allTypes = Object.values(NotificationType)
      expect(result.data).toHaveLength(allTypes.length)

      for (const item of result.data) {
        expect(item.inApp).toBe(true)
        expect(item.browser).toBe(false)
        expect(allTypes).toContain(item.type)
      }
    })

    it('should use stored preference values when they exist', async () => {
      repository.findPreferences.mockResolvedValue([
        {
          userId,
          type: NotificationType.NEW_MESSAGE,
          inApp: false,
          browser: true,
        } as never,
      ])

      const result = await service.getPreferences(userId)

      const newMessagePref = result.data.find((p) => p.type === NotificationType.NEW_MESSAGE)
      expect(newMessagePref?.inApp).toBe(false)
      expect(newMessagePref?.browser).toBe(true)

      // Other types should still use defaults
      const otherPref = result.data.find((p) => p.type === NotificationType.DEAL_WON)
      expect(otherPref?.inApp).toBe(true)
      expect(otherPref?.browser).toBe(false)
    })
  })

  describe('updatePreference', () => {
    it('should call upsertPreference with correct arguments and return updated preference', async () => {
      const updatedPref = {
        userId,
        type: NotificationType.NEW_MESSAGE,
        inApp: false,
        browser: true,
      }
      repository.upsertPreference.mockResolvedValue(updatedPref as never)

      const result = await service.updatePreference(
        userId,
        NotificationType.NEW_MESSAGE,
        { inApp: false, browser: true },
      )

      expect(repository.upsertPreference).toHaveBeenCalledWith(
        userId,
        NotificationType.NEW_MESSAGE,
        false,
        true,
      )
      expect(result).toEqual({ data: updatedPref })
    })
  })

  describe('getUnreadCount', () => {
    it('should return the unread count', async () => {
      repository.countUnread.mockResolvedValue(7)

      const result = await service.getUnreadCount(userId)

      expect(repository.countUnread).toHaveBeenCalledWith(userId)
      expect(result).toEqual({ data: { count: 7 } })
    })

    it('should return 0 when there are no unread notifications', async () => {
      repository.countUnread.mockResolvedValue(0)

      const result = await service.getUnreadCount(userId)

      expect(result).toEqual({ data: { count: 0 } })
    })
  })
})
