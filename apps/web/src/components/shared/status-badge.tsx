import React from 'react'
import { cn } from '@/lib/utils'

type Status = 'connected' | 'connecting' | 'disconnected' | 'pending' | 'running' | 'paused' | 'completed' | 'failed'

const statusConfig: Record<Status, { label: string; dot: string; text: string }> = {
  connected: { label: 'Conectado', dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  connecting: { label: 'Conectando', dot: 'bg-yellow-500 animate-pulse', text: 'text-yellow-700 dark:text-yellow-400' },
  disconnected: { label: 'Desconectado', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
  pending: { label: 'Pendente', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400' },
  running: { label: 'Em andamento', dot: 'bg-blue-500 animate-pulse', text: 'text-blue-700 dark:text-blue-400' },
  paused: { label: 'Pausado', dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
  completed: { label: 'Concluído', dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  failed: { label: 'Falhou', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
}

interface StatusBadgeProps {
  status: Status
  className?: string
  showLabel?: boolean
}

export function StatusBadge({ status, className, showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('h-2 w-2 rounded-full shrink-0', config.dot)} />
      {showLabel && <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>}
    </div>
  )
}
