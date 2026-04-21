'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Integration {
  id: string
  provider: string
  providerAccountId: string
  isActive: boolean
}

interface CalendarEventConfigProps {
  value: {
    integrationId?: string
    defaultDurationMinutes?: number
    defaultLocation?: string
    timezone?: string
    createMeetLink?: boolean
  }
  onChange: (config: Record<string, unknown>) => void
}

export function CalendarEventConfig({ value, onChange }: CalendarEventConfigProps) {
  const t = useTranslations('aiTools')

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiGet<{ data: Integration[] }>('integrations').then((r) => r.data),
  })

  const calendarIntegrations = integrations.filter(
    (i) => i.provider === 'google_calendar' && i.isActive,
  )

  const update = (patch: Record<string, unknown>) => {
    onChange({ ...value, ...patch })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (calendarIntegrations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('config.noCalendarIntegration')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('config.integration')}</Label>
        <Select
          value={value.integrationId ?? ''}
          onValueChange={(v) => update({ integrationId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('config.selectIntegration')} />
          </SelectTrigger>
          <SelectContent>
            {calendarIntegrations.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.providerAccountId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('config.defaultDuration')}</Label>
        <Select
          value={String(value.defaultDurationMinutes ?? 60)}
          onValueChange={(v) => update({ defaultDurationMinutes: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 min</SelectItem>
            <SelectItem value="45">45 min</SelectItem>
            <SelectItem value="60">1 hora</SelectItem>
            <SelectItem value="90">1h30</SelectItem>
            <SelectItem value="120">2 horas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('config.timezone')}</Label>
        <Select
          value={value.timezone ?? 'America/Sao_Paulo'}
          onValueChange={(v) => update({ timezone: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (BRT)</SelectItem>
            <SelectItem value="America/Manaus">America/Manaus (AMT)</SelectItem>
            <SelectItem value="America/Belem">America/Belem (BRT)</SelectItem>
            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
            <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
            <SelectItem value="Europe/Madrid">Europe/Madrid (CET)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('config.defaultLocation')}</Label>
        <Input
          value={value.defaultLocation ?? ''}
          onChange={(e) => update({ defaultLocation: e.target.value })}
          placeholder={t('config.defaultLocationPlaceholder')}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>{t('config.createMeetLink')}</Label>
          <p className="text-xs text-muted-foreground">{t('config.createMeetLinkHint')}</p>
        </div>
        <Switch
          checked={value.createMeetLink ?? true}
          onCheckedChange={(v) => update({ createMeetLink: v })}
        />
      </div>
    </div>
  )
}
