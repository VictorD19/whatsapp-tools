'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, Clock, Timer, Users, Radio } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface StepConfigProps {
  name: string
  delay: number
  scheduledAt: string
  selectedInstanceCount: number
  selectedContactListCount: number
  totalEstimatedRecipients: number
  onNameChange: (name: string) => void
  onDelayChange: (delay: number) => void
  onScheduledAtChange: (scheduledAt: string) => void
}

export function StepConfig({
  name,
  delay,
  scheduledAt,
  selectedInstanceCount,
  selectedContactListCount,
  totalEstimatedRecipients,
  onNameChange,
  onDelayChange,
  onScheduledAtChange,
}: StepConfigProps) {
  const t = useTranslations('broadcasts.config')
  return (
    <div className="space-y-5">
      {/* Campaign name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('campaignName')}</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('campaignNamePlaceholder')}
        />
      </div>

      {/* Delay */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('delayLabel')}</Label>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            min={1}
            max={120}
            value={delay}
            onChange={(e) => onDelayChange(Math.max(1, Math.min(120, Number(e.target.value))))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">{t('delayUnit')}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('delayDescription')}
        </p>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('scheduleLabel')}</Label>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            className="w-auto"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {scheduledAt
            ? t('scheduleActiveDesc')
            : t('scheduleEmptyDesc')}
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-medium mb-3">{t('summaryTitle')}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">{t('summaryInstances')}</span>
            <span className="font-medium">{selectedInstanceCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{t('summaryLists')}</span>
            <span className="font-medium">{selectedContactListCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('summaryRecipients')}</span>
            <span className="font-medium">~{totalEstimatedRecipients}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('summaryDelay')}</span>
            <span className="font-medium">{delay}s</span>
          </div>
        </div>
        {totalEstimatedRecipients > 0 && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-3">
            {t('estimatedTime', { minutes: Math.ceil((totalEstimatedRecipients * delay) / 60) })}
          </p>
        )}
      </div>
    </div>
  )
}
