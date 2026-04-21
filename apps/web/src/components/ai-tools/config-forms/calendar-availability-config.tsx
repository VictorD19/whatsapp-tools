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

interface CalendarAvailabilityConfigProps {
  value: {
    integrationId?: string
    lookAheadDays?: number
    slotDurationMinutes?: number
    workingHours?: {
      start: string
      end: string
      workingDays: number[]
    }
  }
  onChange: (config: Record<string, unknown>) => void
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
]

export function CalendarAvailabilityConfig({ value, onChange }: CalendarAvailabilityConfigProps) {
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

  const toggleDay = (day: number) => {
    const current = value.workingHours?.workingDays ?? [1, 2, 3, 4, 5]
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort()
    update({
      workingHours: {
        start: value.workingHours?.start ?? '08:00',
        end: value.workingHours?.end ?? '18:00',
        workingDays: next,
      },
    })
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
        <Label>{t('config.lookAheadDays')}</Label>
        <Input
          type="number"
          min={1}
          max={30}
          value={value.lookAheadDays ?? 7}
          onChange={(e) => update({ lookAheadDays: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('config.slotDuration')}</Label>
        <Select
          value={String(value.slotDurationMinutes ?? 60)}
          onValueChange={(v) => update({ slotDurationMinutes: Number(v) })}
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
        <Label>{t('config.workingHours')}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={value.workingHours?.start ?? '08:00'}
            onChange={(e) =>
              update({
                workingHours: {
                  start: e.target.value,
                  end: value.workingHours?.end ?? '18:00',
                  workingDays: value.workingHours?.workingDays ?? [1, 2, 3, 4, 5],
                },
              })
            }
            className="w-28"
          />
          <span className="text-muted-foreground">ate</span>
          <Input
            type="time"
            value={value.workingHours?.end ?? '18:00'}
            onChange={(e) =>
              update({
                workingHours: {
                  start: value.workingHours?.start ?? '08:00',
                  end: e.target.value,
                  workingDays: value.workingHours?.workingDays ?? [1, 2, 3, 4, 5],
                },
              })
            }
            className="w-28"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('config.workingDays')}</Label>
        <div className="flex gap-1.5">
          {WEEKDAY_OPTIONS.map(({ value: day, label }) => {
            const selected = (value.workingHours?.workingDays ?? [1, 2, 3, 4, 5]).includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`h-8 w-10 rounded-md border text-xs font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
