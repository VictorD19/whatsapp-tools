'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function getProgressColor(percentage: number): string {
  if (percentage > 85) return 'bg-red-500'
  if (percentage > 60) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100)

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div
          className={cn('h-full transition-all duration-500 ease-out rounded-full', getProgressColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  },
)
Progress.displayName = 'Progress'

export { Progress }
