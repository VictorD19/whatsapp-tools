'use client'

import React from 'react'
import { Tag, Briefcase } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export type AiToolType =
  | 'ADICIONAR_TAG'
  | 'CRIAR_DEAL'

interface ToolTypeOption {
  type: AiToolType
  icon: React.ElementType
}

const TOOL_TYPE_ICONS: ToolTypeOption[] = [
  { type: 'ADICIONAR_TAG', icon: Tag },
  { type: 'CRIAR_DEAL', icon: Briefcase },
]

export { TOOL_TYPE_ICONS as TOOL_TYPES }

interface ToolTypeSelectorProps {
  value: AiToolType | ''
  onChange: (type: AiToolType) => void
  disabled?: boolean
}

export function ToolTypeSelector({ value, onChange, disabled }: ToolTypeSelectorProps) {
  const t = useTranslations('aiTools.types')
  return (
    <div className="grid grid-cols-2 gap-2">
      {TOOL_TYPE_ICONS.map(({ type, icon: Icon }) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onChange(type)}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
            value === type
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:border-primary/40 hover:bg-muted/50',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
            value === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{t(`${type}.label`)}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t(`${type}.description`)}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
