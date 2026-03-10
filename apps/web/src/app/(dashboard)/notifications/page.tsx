'use client'

import React, { useCallback, useEffect, useState } from 'react'
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
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationsStore, type Notification } from '@/stores/notifications.store'
import { cn } from '@/lib/utils'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

function groupByDate(notifications: Notification[], labels: { today: string; yesterday: string; thisWeek: string; older: string }): { label: string; items: Notification[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const weekAgo = today - 7 * 86400000

  const groups: Record<string, Notification[]> = {
    [labels.today]: [],
    [labels.yesterday]: [],
    [labels.thisWeek]: [],
    [labels.older]: [],
  }

  for (const n of notifications) {
    const ts = new Date(n.createdAt).getTime()
    if (ts >= today) {
      groups[labels.today].push(n)
    } else if (ts >= yesterday) {
      groups[labels.yesterday].push(n)
    } else if (ts >= weekAgo) {
      groups[labels.thisWeek].push(n)
    } else {
      groups[labels.older].push(n)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

function NotificationTypeIcon({ type }: { type: string }) {
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

export default function NotificationsPage() {
  const t = useTranslations('notifications')
  const tc = useTranslations('common')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const { notifications, unreadCount, isLoading, hasMore, page, setNotifications, appendNotifications, markAsRead, markAllAsRead, setLoading } =
    useNotificationsStore()

  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchPage = useCallback(
    async (p: number, append = false) => {
      const token = getToken()
      if (!token) return
      if (p === 1) setLoading(true)
      else setLoadingMore(true)
      try {
        const res = await fetch(`${API_URL}/notifications?page=${p}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = await res.json()
        if (append) {
          appendNotifications(json.data, json.meta)
        } else {
          setNotifications(json.data, json.meta)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [setNotifications, appendNotifications, setLoading],
  )

  useEffect(() => {
    fetchPage(1)
  }, [fetchPage])

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
    setMarkingAll(true)
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      markAllAsRead()
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false)
    }
  }, [markAllAsRead])

  const groups = groupByDate(notifications, {
    today: t('dateGroups.today'),
    yesterday: t('dateGroups.yesterday'),
    thisWeek: t('dateGroups.thisWeek'),
    older: t('dateGroups.older'),
  })

  return (
    <PageLayout breadcrumb={[{ label: t('title') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? (unreadCount === 1 ? t('page.unreadCount', { count: unreadCount }) : t('page.unreadCountPlural', { count: unreadCount })) : t('empty.title')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? t('page.marking') : t('page.markAllRead')}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t('empty.title')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </h2>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/60">
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40',
                      !n.read && 'bg-primary/5 hover:bg-primary/10',
                    )}
                    onClick={() => { if (!n.read) handleMarkAsRead(n.id) }}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        n.read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                      )}
                    >
                      <NotificationTypeIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => fetchPage(page + 1, true)}
              >
                {loadingMore ? t('page.loading') : t('page.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}
