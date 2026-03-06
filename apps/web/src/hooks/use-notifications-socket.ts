'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useNotificationsStore, type Notification } from '@/stores/notifications.store'
import { useAuthStore } from '@/stores/auth.store'
import { useBrowserNotifications } from '@/hooks/use-browser-notifications'

export function useNotificationsSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { user } = useAuthStore()
  const { addNotification, setUnreadCount, preferences } = useNotificationsStore()
  const { showBrowserNotification } = useBrowserNotifications()

  useEffect(() => {
    if (!user?.id) return

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001'

    socketRef.current = io(apiUrl, {
      auth: { userId: user.id, tenantId: user.tenantId },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })

    const socket = socketRef.current

    socket.on(
      'notification:new',
      ({ notification, unreadCount }: { notification: Notification; unreadCount: number }) => {
        addNotification(notification)
        setUnreadCount(unreadCount)

        // Show browser notification if preference is active for this type
        const pref = preferences.find((p) => p.type === notification.type)
        if (pref?.browser) {
          showBrowserNotification(
            notification.title,
            notification.body,
            notification.data ?? undefined,
          )
        }
      },
    )

    socket.on('notification:unread_count', ({ count }: { count: number }) => {
      setUnreadCount(count)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?.id, user?.tenantId, addNotification, setUnreadCount, preferences, showBrowserNotification])
}
