import React from 'react'
import type { ImportProgress } from '@/stores/instances.store'

interface ImportProgressBarProps {
  progress: ImportProgress
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  if (!progress.importing || progress.total === 0) return null

  const processed = progress.imported + progress.skipped
  const percent = Math.round((processed / progress.total) * 100)

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Importando conversas...</span>
        <span>{processed} de {progress.total}</span>
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
