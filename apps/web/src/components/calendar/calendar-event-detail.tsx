'use client'

import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/formatting'
import type { CalendarEvent } from '@/hooks/use-calendar-events'

interface CalendarEventDetailProps {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
}

export function CalendarEventDetail({
  event,
  open,
  onClose,
}: CalendarEventDetailProps) {
  const t = useTranslations('calendar')

  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{event.title}</SheetTitle>
          <SheetDescription>
            {formatDateTime(event.startAt)} — {formatDateTime(event.endAt).split(' ').pop()}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">📍</span>
              <span>{event.location}</span>
            </div>
          )}

          {event.assistant && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">🤖</span>
              <div>
                <div className="font-medium">{event.assistant.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t('detail.assistant')}
                </div>
              </div>
            </div>
          )}

          {event.hangoutLink && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">🔗</span>
              <a
                href={event.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t('detail.meetLink')}
              </a>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              {t('detail.description')}
            </div>
            <div className="text-sm leading-relaxed">
              {event.description || t('detail.noDescription')}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
