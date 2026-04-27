'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api'

export interface CalendarEventAssistant {
  id: string
  name: string
  avatarEmoji: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string
  timezone: string
  location: string | null
  hangoutLink: string | null
  status: string
  attendees: unknown
  assistant: CalendarEventAssistant | null
  createdAt: string
}

export function useCalendarEvents() {
  const t = useTranslations('calendar')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(
    async (start: string, end: string, assistantId?: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ start, end })
        if (assistantId) params.set('assistantId', assistantId)

        const res = await apiGet<{ data: CalendarEvent[] }>(
          `integrations/calendar-events?${params}`,
        )
        setEvents(res.data)
      } catch {
        toast.error(t('noEvents'))
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  return { events, loading, fetchEvents }
}
