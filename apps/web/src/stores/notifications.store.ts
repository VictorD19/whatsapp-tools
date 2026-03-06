import { create } from 'zustand'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  readAt?: string | null
  data?: Record<string, unknown> | null
  createdAt: string
}

export interface NotificationPreference {
  type: string
  inApp: boolean
  browser: boolean
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  hasMore: boolean
  page: number
  preferences: NotificationPreference[]
  setNotifications: (
    notifications: Notification[],
    meta: { unreadCount: number; totalPages: number; page: number },
  ) => void
  appendNotifications: (
    notifications: Notification[],
    meta: { unreadCount: number; totalPages: number; page: number },
  ) => void
  addNotification: (notification: Notification) => void
  setUnreadCount: (count: number) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  setLoading: (loading: boolean) => void
  setPreferences: (prefs: NotificationPreference[]) => void
  reset: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: false,
  page: 1,
  preferences: [],

  setNotifications: (notifications, meta) =>
    set({
      notifications,
      unreadCount: meta.unreadCount,
      hasMore: meta.page < meta.totalPages,
      page: meta.page,
    }),

  appendNotifications: (notifications, meta) =>
    set((state) => ({
      notifications: [...state.notifications, ...notifications],
      unreadCount: meta.unreadCount,
      hasMore: meta.page < meta.totalPages,
      page: meta.page,
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  markAsRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id)
      const wasUnread = target && !target.read
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - (wasUnread ? 1 : 0)),
      }
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setPreferences: (preferences) => set({ preferences }),

  reset: () =>
    set({ notifications: [], unreadCount: 0, isLoading: false, hasMore: false, page: 1 }),
}))
