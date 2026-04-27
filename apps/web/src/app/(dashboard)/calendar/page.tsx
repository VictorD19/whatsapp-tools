'use client'

import { useTranslations } from 'next-intl'
import { PageLayout } from '@/components/layout/page-layout'
import { CalendarView } from '@/components/calendar/calendar-view'

export default function CalendarPage() {
  const t = useTranslations('calendar')
  const tNav = useTranslations('nav')

  return (
    <PageLayout breadcrumb={[{ label: tNav('items.calendar') }]}>
      <CalendarView />
    </PageLayout>
  )
}
