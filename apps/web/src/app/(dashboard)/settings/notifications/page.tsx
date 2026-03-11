'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  Clock,
  MessageSquare,
  Wifi,
  Trophy,
  Users,
  Loader2,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'
import { useNotificationsStore, type NotificationPreference } from '@/stores/notifications.store'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

type NotificationType =
  | 'NEW_MESSAGE'
  | 'CONVERSATION_ASSIGNED'
  | 'CONVERSATION_TRANSFERRED'
  | 'CONVERSATIONS_IMPORTED'
  | 'INSTANCE_CONNECTED'
  | 'INSTANCE_DISCONNECTED'
  | 'INSTANCE_BANNED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'DEAL_ASSIGNED'
  | 'GROUP_EXTRACTION_COMPLETED'
  | 'FOLLOW_UP_DUE'

// TYPE_LABELS moved inside component to use translations

const PREFERENCE_GROUPS: {
  labelKey: string
  icon: React.ElementType
  types: NotificationType[]
}[] = [
  {
    labelKey: 'groups.inbox',
    icon: MessageSquare,
    types: [
      'NEW_MESSAGE',
      'CONVERSATION_ASSIGNED',
      'CONVERSATION_TRANSFERRED',
      'CONVERSATIONS_IMPORTED',
    ],
  },
  {
    labelKey: 'groups.instances',
    icon: Wifi,
    types: ['INSTANCE_CONNECTED', 'INSTANCE_DISCONNECTED', 'INSTANCE_BANNED'],
  },
  {
    labelKey: 'groups.deals',
    icon: Trophy,
    types: ['DEAL_WON', 'DEAL_LOST', 'DEAL_ASSIGNED'],
  },
  {
    labelKey: 'groups.groups',
    icon: Users,
    types: ['GROUP_EXTRACTION_COMPLETED'],
  },
  {
    labelKey: 'groups.followUps',
    icon: Clock,
    types: ['FOLLOW_UP_DUE'],
  },
]

export default function NotificationPreferencesPage() {
  const t = useTranslations('notificationPreferences')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const typeLabels: Record<NotificationType, string> = {
    NEW_MESSAGE: t('types.NEW_MESSAGE'),
    CONVERSATION_ASSIGNED: t('types.CONVERSATION_ASSIGNED'),
    CONVERSATION_TRANSFERRED: t('types.CONVERSATION_TRANSFERRED'),
    CONVERSATIONS_IMPORTED: t('types.CONVERSATIONS_IMPORTED'),
    INSTANCE_CONNECTED: t('types.INSTANCE_CONNECTED'),
    INSTANCE_DISCONNECTED: t('types.INSTANCE_DISCONNECTED'),
    INSTANCE_BANNED: t('types.INSTANCE_BANNED'),
    DEAL_WON: t('types.DEAL_WON'),
    DEAL_LOST: t('types.DEAL_LOST'),
    DEAL_ASSIGNED: t('types.DEAL_ASSIGNED'),
    GROUP_EXTRACTION_COMPLETED: t('types.GROUP_EXTRACTION_COMPLETED'),
    FOLLOW_UP_DUE: t('types.FOLLOW_UP_DUE'),
  }

  const { preferences, setPreferences } = useNotificationsStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setPreferences(json.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [setPreferences])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const getPref = useCallback(
    (type: string): NotificationPreference =>
      preferences.find((p) => p.type === type) ?? { type, inApp: true, browser: false },
    [preferences],
  )

  const handleToggle = useCallback(
    async (type: string, field: 'inApp' | 'browser', value: boolean) => {
      const token = getToken()
      if (!token) return

      const current = getPref(type)
      const updated: NotificationPreference = { ...current, [field]: value }

      // Optimistic update
      const newPrefs = preferences.some((p) => p.type === type)
        ? preferences.map((p) => (p.type === type ? updated : p))
        : [...preferences, updated]
      setPreferences(newPrefs)

      setSaving(`${type}-${field}`)
      try {
        await fetch(`${API_URL}/notifications/preferences/${type}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inApp: updated.inApp, browser: updated.browser }),
        })
      } catch {
        // Revert on failure
        setPreferences(preferences)
      } finally {
        setSaving(null)
      }
    },
    [preferences, setPreferences, getPref],
  )

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.notifications') }]}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-6">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {PREFERENCE_GROUPS.map((group, gi) => {
            const GroupIcon = group.icon
            return (
              <div key={group.labelKey} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/50">
                  <GroupIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t(group.labelKey)}
                  </span>
                </div>

                {/* Column headers */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground font-medium">{t('columns.type')}</span>
                  <div className="flex items-center gap-8 pr-1">
                    <span className="text-xs text-muted-foreground font-medium w-10 text-center">{t('columns.inApp')}</span>
                    <span className="text-xs text-muted-foreground font-medium w-14 text-center">{t('columns.browser')}</span>
                  </div>
                </div>

                {/* Preference rows */}
                <div className="divide-y divide-border">
                  {group.types.map((type) => {
                    const pref = getPref(type)
                    const inAppKey = `${type}-inApp`
                    const browserKey = `${type}-browser`
                    return (
                      <div key={type} className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {(saving === inAppKey || saving === browserKey) && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                          <p className="text-sm font-medium text-foreground">
                            {typeLabels[type]}
                          </p>
                        </div>
                        <div className="flex items-center gap-8 pr-1">
                          <div className="w-10 flex justify-center">
                            <Switch
                              checked={pref.inApp}
                              onCheckedChange={(v) => handleToggle(type, 'inApp', v)}
                              disabled={saving === inAppKey}
                            />
                          </div>
                          <div className="w-14 flex justify-center">
                            <Switch
                              checked={pref.browser}
                              onCheckedChange={(v) => handleToggle(type, 'browser', v)}
                              disabled={saving === browserKey}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Info box */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <Bell className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {t('browserPermissionWarning')}
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
