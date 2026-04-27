'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEventAssistant } from '@/hooks/use-calendar-events'

interface CalendarToolbarProps {
  title: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  assistants: CalendarEventAssistant[]
  selectedAssistantId: string | null
  onAssistantChange: (id: string | null) => void
}

export function CalendarToolbar({
  title,
  onPrev,
  onNext,
  onToday,
  assistants,
  selectedAssistantId,
  onAssistantChange,
}: CalendarToolbarProps) {
  const t = useTranslations('calendar')

  const uniqueAssistants = assistants.filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  )

  return (
    <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onToday}>
          {t('today')}
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[160px] text-center text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {uniqueAssistants.length > 1 && (
        <Select
          value={selectedAssistantId ?? 'all'}
          onValueChange={(v) => onAssistantChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filterPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterPlaceholder')}</SelectItem>
            {uniqueAssistants.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.avatarEmoji} {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
