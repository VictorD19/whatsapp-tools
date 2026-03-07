'use client'

import React from 'react'
import { Search, UserPlus, Tag, Briefcase, Handshake, Webhook } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AiToolType =
  | 'BUSCAR_CONTATO'
  | 'CRIAR_CONTATO'
  | 'ADICIONAR_TAG'
  | 'CRIAR_DEAL'
  | 'TRANSFERIR_HUMANO'
  | 'WEBHOOK_EXTERNO'

interface ToolTypeOption {
  type: AiToolType
  icon: React.ElementType
  label: string
  description: string
}

const TOOL_TYPES: ToolTypeOption[] = [
  { type: 'BUSCAR_CONTATO', icon: Search, label: 'Buscar Contato', description: 'Busca dados do contato no CRM' },
  { type: 'CRIAR_CONTATO', icon: UserPlus, label: 'Criar Contato', description: 'Registra o contato no CRM' },
  { type: 'ADICIONAR_TAG', icon: Tag, label: 'Adicionar Tag', description: 'Aplica tags ao contato' },
  { type: 'CRIAR_DEAL', icon: Briefcase, label: 'Criar Deal', description: 'Abre um deal no CRM' },
  { type: 'TRANSFERIR_HUMANO', icon: Handshake, label: 'Transferir p/ Humano', description: 'Pausa IA, passa para atendente' },
  { type: 'WEBHOOK_EXTERNO', icon: Webhook, label: 'Webhook Externo', description: 'Chama URL externa com dados' },
]

export { TOOL_TYPES }

interface ToolTypeSelectorProps {
  value: AiToolType | ''
  onChange: (type: AiToolType) => void
  disabled?: boolean
}

export function ToolTypeSelector({ value, onChange, disabled }: ToolTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TOOL_TYPES.map(({ type, icon: Icon, label, description }) => (
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
            <p className="text-sm font-medium leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
