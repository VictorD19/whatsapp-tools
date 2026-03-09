'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  MessageSquare,
  Wifi,
  Trophy,
  Users,
  Loader2,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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

const TYPE_LABELS: Record<NotificationType, string> = {
  NEW_MESSAGE: 'Nova mensagem',
  CONVERSATION_ASSIGNED: 'Conversa assumida',
  CONVERSATION_TRANSFERRED: 'Conversa transferida',
  CONVERSATIONS_IMPORTED: 'Importacao concluida',
  INSTANCE_CONNECTED: 'Instancia conectada',
  INSTANCE_DISCONNECTED: 'Instancia desconectada',
  INSTANCE_BANNED: 'Instancia banida',
  DEAL_WON: 'Deal ganho',
  DEAL_LOST: 'Deal perdido',
  DEAL_ASSIGNED: 'Deal atribuido',
  GROUP_EXTRACTION_COMPLETED: 'Extracao de grupo concluida',
}

const PREFERENCE_GROUPS: {
  label: string
  icon: React.ElementType
  types: NotificationType[]
}[] = [
  {
    label: 'Inbox',
    icon: MessageSquare,
    types: [
      'NEW_MESSAGE',
      'CONVERSATION_ASSIGNED',
      'CONVERSATION_TRANSFERRED',
      'CONVERSATIONS_IMPORTED',
    ],
  },
  {
    label: 'Instancias',
    icon: Wifi,
    types: ['INSTANCE_CONNECTED', 'INSTANCE_DISCONNECTED', 'INSTANCE_BANNED'],
  },
  {
    label: 'Deals',
    icon: Trophy,
    types: ['DEAL_WON', 'DEAL_LOST', 'DEAL_ASSIGNED'],
  },
  {
    label: 'Grupos',
    icon: Users,
    types: ['GROUP_EXTRACTION_COMPLETED'],
  },
]

export default function NotificationPreferencesPage() {
  React.useEffect(() => { document.title = 'Preferências de Notificação | SistemaZapChat' }, [])

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
    <PageLayout breadcrumb={[{ label: 'Configurações' }, { label: 'Notificações' }]}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Preferencias de Notificacao</h1>
        <p className="text-sm text-gray-500 mt-1">
          Controle como e quando voce deseja ser notificado para cada evento.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
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
              <div key={group.label} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <GroupIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                    {group.label}
                  </span>
                </div>

                {/* Column headers */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-400 font-medium">Tipo</span>
                  <div className="flex items-center gap-8 pr-1">
                    <span className="text-xs text-gray-400 font-medium w-10 text-center">No app</span>
                    <span className="text-xs text-gray-400 font-medium w-14 text-center">Browser</span>
                  </div>
                </div>

                {/* Preference rows */}
                <div className="divide-y divide-gray-100">
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
                          <p className="text-sm font-medium text-gray-800">
                            {TYPE_LABELS[type]}
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
              Para receber notificacoes no browser, seu navegador precisara conceder permissao quando solicitado.
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
