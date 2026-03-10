import React from 'react'
import { useTranslations } from 'next-intl'
import type { ImportProgress } from '@/stores/instances.store'

interface ImportProgressBarProps {
  progress: ImportProgress
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  const t = useTranslations('instances.import')
  if (!progress.importing) return null

  if (progress.total === 0) {
    return (
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-3 w-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <span>{t('searching')}</span>
        </div>
      </div>
    )
  }

  const processed = progress.imported + progress.skipped
  const percent = Math.round((processed / progress.total) * 100)

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t('importing')}</span>
        <span>{processed} {t('of')} {progress.total}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
