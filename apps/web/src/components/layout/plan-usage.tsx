'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Radio, Users, Bot, Megaphone, Gauge, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { apiGet } from '@/lib/api'

interface UsageData {
  plan: {
    name: string
    maxInstances: number
    maxUsers: number
    maxAssistants: number
    maxBroadcastsPerDay: number
    maxContactsPerBroadcast: number
  }
  usage: {
    instances: number
    users: number
    assistants: number
    broadcastsToday: number
  }
}

interface LimitRowProps {
  icon: React.ElementType
  label: string
  current: number
  max: number
}

function getColor(pct: number) {
  if (pct > 85) return 'text-red-500'
  if (pct > 60) return 'text-yellow-500'
  return 'text-emerald-500'
}

function getProgressColor(pct: number) {
  if (pct > 85) return 'bg-red-500'
  if (pct > 60) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function LimitRow({ icon: Icon, label, current, max }: LimitRowProps) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{label}</span>
        </div>
        <span className={cn('text-sm font-medium tabular-nums', getColor(pct))}>
          {current} / {max}
        </span>
      </div>
      <Progress value={current} max={max} />
    </div>
  )
}

function computeOverallPercentage(data: UsageData): number {
  const items = [
    { current: data.usage.instances, max: data.plan.maxInstances },
    { current: data.usage.users, max: data.plan.maxUsers },
    { current: data.usage.assistants, max: data.plan.maxAssistants },
    { current: data.usage.broadcastsToday, max: data.plan.maxBroadcastsPerDay },
  ]

  let total = 0
  let count = 0
  for (const item of items) {
    if (item.max > 0) {
      total += (item.current / item.max) * 100
      count++
    }
  }

  const avg = count > 0 ? total / count : 0
  return Math.min(Math.round(avg), 100)
}

export const USAGE_QUERY_KEY = ['tenants-usage']

function useUsageData() {
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: USAGE_QUERY_KEY,
    queryFn: () => apiGet<{ data: UsageData }>('tenants/usage').then((res) => res.data),
  })

  return { data: data ?? null, open, setOpen }
}

/* ──────────────────────────────────────────────
   PlanUsageInline — card embutido no topo do sidebar
────────────────────────────────────────────── */
interface PlanUsageProps {
  collapsed: boolean
}

export function PlanUsageInline({ collapsed }: PlanUsageProps) {
  const { data, open, setOpen } = useUsageData()

  if (!data) return null

  const overallPct = computeOverallPercentage(data)
  const progressColor = getProgressColor(overallPct)

  if (collapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setOpen(true)}
              className="flex w-full justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Gauge className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {data.plan.name} — {overallPct}% usado
          </TooltipContent>
        </Tooltip>
        <UsageDialog open={open} onOpenChange={setOpen} data={data} />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-semibold text-sidebar-foreground">
              {data.plan.name}
            </span>
          </div>
          <span className={cn('text-[11px] font-bold tabular-nums', getColor(overallPct))}>
            {overallPct}%
          </span>
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border">
          <div
            className={cn('h-full rounded-full transition-all', progressColor)}
            style={{ width: `${overallPct}%` }}
          />
        </div>

        <p className="mt-1.5 text-[10px] text-muted-foreground group-hover:text-sidebar-foreground transition-colors">
          Ver detalhes dos limites →
        </p>
      </button>

      <UsageDialog open={open} onOpenChange={setOpen} data={data} />
    </>
  )
}

/* ──────────────────────────────────────────────
   PlanUsage — versão legada (mantida para compatibilidade)
────────────────────────────────────────────── */
export function PlanUsage({ collapsed }: PlanUsageProps) {
  return <PlanUsageInline collapsed={collapsed} />
}

/* ──────────────────────────────────────────────
   Dialog de detalhes
────────────────────────────────────────────── */
function UsageDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  data: UsageData
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Limites do plano</DialogTitle>
          <DialogDescription>
            Plano {data.plan.name} — uso atual dos recursos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <LimitRow
            icon={Radio}
            label="Instâncias WhatsApp"
            current={data.usage.instances}
            max={data.plan.maxInstances}
          />
          <LimitRow
            icon={Users}
            label="Atendentes"
            current={data.usage.users}
            max={data.plan.maxUsers}
          />
          <LimitRow
            icon={Bot}
            label="Assistentes IA"
            current={data.usage.assistants}
            max={data.plan.maxAssistants}
          />
          <LimitRow
            icon={Megaphone}
            label="Disparos / dia"
            current={data.usage.broadcastsToday}
            max={data.plan.maxBroadcastsPerDay}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
