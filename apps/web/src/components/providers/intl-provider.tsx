'use client'

import React, { useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { useLocaleStore } from '@/stores/locale.store'
import ptBR from '../../../messages/pt-BR.json'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'

type Messages = typeof ptBR

const messagesMap: Record<string, Messages> = {
  'pt-BR': ptBR,
  en: en as unknown as Messages,
  es: es as unknown as Messages,
}

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const { locale, timezone } = useLocaleStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Use default during SSR to avoid hydration mismatch
  const activeLocale = mounted ? locale : 'pt-BR'
  const messages = messagesMap[activeLocale] ?? messagesMap['pt-BR']

  return (
    <NextIntlClientProvider
      locale={activeLocale}
      messages={messages}
      timeZone={timezone}
      now={new Date()}
    >
      {children}
    </NextIntlClientProvider>
  )
}
