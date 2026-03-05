'use client'

import React, { useEffect, useState } from 'react'
import { Radio, Users, Bot, Megaphone, Gauge } from 'lucide-react'
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

  // Highest usage percentage across all limits
  let highest = 0
  for (const item of items) {
    if (item.max > 0) {
      const pct = (item.current / item.max) * 100
      if (pct > highest) highest = pct
    }
  }

  return Math.min(Math.round(highest), 100)
}

interface PlanUsageProps {
  collapsed: boolean
}

export function PlanUsage({ collapsed }: PlanUsageProps) {
  const [data, setData] = useState<UsageData | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    apiGet<{ data: UsageData }>('tenants/usage')
      .then((res) => setData(res.data))
      .catch(() => {})
  }, [])

  if (!data) return null

  const overallPct = computeOverallPercentage(data)

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-300 hover:bg-sidebar-accent group',
        collapsed && 'justify-center px-2'
      )}
    >
      <Gauge className="shrink-0 h-4 w-4 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-muted-foreground group-hover:text-sidebar-foreground truncate">
              {data.plan.name}
            </span>
            <span className={cn('text-[11px] font-medium tabular-nums', getColor(overallPct))}>
              {overallPct}%
            </span>
          </div>
          <Progress value={overallPct} max={100} className="h-1.5" />
        </div>
      )}
    </button>
  )

  return (
    <>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {data.plan.name} — {overallPct}% usado
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
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
              label="Instancias WhatsApp"
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
    </>
  )
}
