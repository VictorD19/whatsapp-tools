'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  MessageSquare,
  Download,
  Wifi,
  WifiOff,
  Trophy,
  TrendingDown,
  UserCheck,
  Users,
  CheckCheck,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotificationsStore, type Notification } from '@/stores/notifications.store'
import { cn } from '@/lib/utils'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

function NotificationIcon({ type }: { type: string }) {
  const className = 'h-4 w-4 shrink-0'
  switch (type) {
    case 'NEW_MESSAGE':
    case 'CONVERSATION_ASSIGNED':
    case 'CONVERSATION_TRANSFERRED':
      return <MessageSquare className={className} />
    case 'CONVERSATIONS_IMPORTED':
      return <Download className={className} />
    case 'INSTANCE_CONNECTED':
      return <Wifi className={className} />
    case 'INSTANCE_DISCONNECTED':
    case 'INSTANCE_BANNED':
      return <WifiOff className={className} />
    case 'DEAL_WON':
      return <Trophy className={className} />
    case 'DEAL_LOST':
      return <TrendingDown className={className} />
    case 'DEAL_ASSIGNED':
      return <UserCheck className={className} />
    case 'GROUP_EXTRACTION_COMPLETED':
      return <Users className={className} />
    default:
      return <Bell className={className} />
  }
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  return (
    <button
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
        !notification.read && 'bg-primary/5',
      )}
      onClick={() => {
        if (!notification.read) onRead(notification.id)
      }}
    >
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          notification.read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        <NotificationIcon type={notification.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-medium truncate', !notification.read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  )
}

export function NotificationBell() {
  const t = useTranslations('notifications.bell')
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, isLoading, setNotifications, markAsRead, markAllAsRead, setPreferences } =
    useNotificationsStore()

  // Fetch initial notifications and preferences on mount
  const fetchNotifications = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/notifications?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data, json.meta)
    } catch {
      // silently fail
    }
  }, [setNotifications])

  const fetchPreferences = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setPreferences(json.data)
    } catch {
      // silently fail
    }
  }, [setPreferences])

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
  }, [fetchNotifications, fetchPreferences])

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      const token = getToken()
      if (!token) return
      try {
        await fetch(`${API_URL}/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        })
        markAsRead(id)
      } catch {
        // silently fail
      }
    },
    [markAsRead],
  )

  const handleMarkAllAsRead = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      markAllAsRead()
    } catch {
      // silently fail
    }
  }, [markAllAsRead])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-1 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t('title')}</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground gap-1 hover:text-foreground"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
            {t('loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={handleMarkAsRead} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <Link
            href="/notifications"
            className="block text-center text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            onClick={() => setOpen(false)}
          >
            {t('viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
