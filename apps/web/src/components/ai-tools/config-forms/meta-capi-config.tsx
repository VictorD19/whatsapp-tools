'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const META_EVENTS = ['Lead', 'Purchase', 'Contact', 'Schedule', 'CompleteRegistration'] as const
type MetaEventName = (typeof META_EVENTS)[number]

interface MetaCapiConfigProps {
  value: { eventName?: MetaEventName }
  onChange: (config: { eventName: MetaEventName }) => void
}

export function MetaCapiConfig({ value, onChange }: MetaCapiConfigProps) {
  const t = useTranslations('aiTools.config.meta')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('eventName')}</Label>
        <Select
          value={value.eventName ?? ''}
          onValueChange={(v) => onChange({ eventName: v as MetaEventName })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectEvent')} />
          </SelectTrigger>
          <SelectContent>
            {META_EVENTS.map((event) => (
              <SelectItem key={event} value={event}>
                {t(`events.${event}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('hint')}</p>
      </div>
    </div>
  )
}
