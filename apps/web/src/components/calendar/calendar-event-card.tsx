'use client'

import { getAssistantColor } from '@/lib/assistant-colors'
import type { CalendarEvent } from '@/hooks/use-calendar-events'

interface CalendarEventCardProps {
  event: CalendarEvent
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const color = getAssistantColor(event.assistant?.id)

  return (
    <div
      className="cursor-pointer truncate rounded-sm px-1.5 py-0.5 text-[11px] leading-tight"
      style={{
        backgroundColor: color.bg,
        borderLeft: `3px solid ${color.border}`,
        color: color.text,
      }}
    >
      {event.assistant?.avatarEmoji && (
        <span className="mr-0.5">{event.assistant.avatarEmoji}</span>
      )}
      {event.title}
    </div>
  )
}
