'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
            value === color
              ? 'border-foreground scale-110'
              : 'border-transparent hover:scale-105'
          )}
          style={{ backgroundColor: color }}
        >
          {value === color && <Check className="h-4 w-4 text-white" />}
        </button>
      ))}
    </div>
  )
}
