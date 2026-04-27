'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import { CalendarToolbar } from './calendar-toolbar'
import { CalendarEventCard } from './calendar-event-card'
import { CalendarEventDetail } from './calendar-event-detail'
import { CalendarLegend } from './calendar-legend'
import { useCalendarEvents, type CalendarEvent } from '@/hooks/use-calendar-events'

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null)
  const { events, fetchEvents } = useCalendarEvents()

  const fetchForRange = useCallback(
    (start: Date, end: Date) => {
      fetchEvents(start.toISOString(), end.toISOString())
    },
    [fetchEvents],
  )

  const handleDates = useCallback(
    (selectInfo: { start: Date; end: Date }) => {
      setTitle(calendarRef.current?.getApi().view.title ?? '')
      fetchForRange(selectInfo.start, selectInfo.end)
    },
    [fetchForRange],
  )

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event.extendedProps.rawEvent as CalendarEvent
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const filteredEvents = useMemo(() => {
    if (!selectedAssistantId) return events
    return events.filter((e) => e.assistant?.id === selectedAssistantId)
  }, [events, selectedAssistantId])

  const calendarEvents: EventInput[] = useMemo(
    () =>
      filteredEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.startAt,
        end: e.endAt,
        extendedProps: { rawEvent: e },
      })),
    [filteredEvents],
  )

  const assistants = useMemo(
    () =>
      events
        .map((e) => e.assistant)
        .filter((a): a is NonNullable<typeof a> => a !== null),
    [events],
  )

  return (
    <div className="rounded-lg border bg-card">
      <CalendarToolbar
        title={title}
        onPrev={() => calendarRef.current?.getApi().prev()}
        onNext={() => calendarRef.current?.getApi().next()}
        onToday={() => calendarRef.current?.getApi().today()}
        assistants={assistants}
        selectedAssistantId={selectedAssistantId}
        onAssistantChange={setSelectedAssistantId}
      />

      <div className="p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={calendarEvents}
          datesSet={handleDates}
          eventClick={handleEventClick}
          eventContent={(arg) => (
            <CalendarEventCard event={arg.event.extendedProps.rawEvent} />
          )}
          height="auto"
          dayMaxEvents={3}
          firstDay={0}
          fixedWeekCount={false}
        />
      </div>

      <CalendarLegend assistants={assistants} />

      <CalendarEventDetail
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
