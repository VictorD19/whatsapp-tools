'use client'

import type { CalendarEventAssistant } from '@/hooks/use-calendar-events'
import { getAssistantColor } from '@/lib/assistant-colors'

interface CalendarLegendProps {
  assistants: CalendarEventAssistant[]
}

export function CalendarLegend({ assistants }: CalendarLegendProps) {
  const uniqueAssistants = assistants.filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  )

  if (uniqueAssistants.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-4 border-t px-5 py-3 text-xs text-muted-foreground">
      {uniqueAssistants.map((assistant) => {
        const color = getAssistantColor(assistant.id)
        return (
          <div key={assistant.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: color.border }}
            />
            {assistant.avatarEmoji} {assistant.name}
          </div>
        )
      })}
    </div>
  )
}
