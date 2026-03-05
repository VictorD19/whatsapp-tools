import { format, isToday, isYesterday } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ptBR, enUS, es } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { useLocaleStore } from '@/stores/locale.store'

const dateFnsLocales: Record<string, Locale> = {
  'pt-BR': ptBR,
  en: enUS,
  es,
}

function getLocaleSettings() {
  return useLocaleStore.getState()
}

function getDateFnsLocale(locale?: string): Locale {
  const l = locale ?? getLocaleSettings().locale
  return dateFnsLocales[l] ?? ptBR
}

function toTz(date: string | Date, tz?: string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return toZonedTime(d, tz ?? getLocaleSettings().timezone)
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  const zoned = toTz(date)
  return format(zoned, pattern, { locale: getDateFnsLocale() })
}

export function formatTime(date: string | Date): string {
  const zoned = toTz(date)
  return format(zoned, 'HH:mm', { locale: getDateFnsLocale() })
}

export function formatDateTime(date: string | Date): string {
  const zoned = toTz(date)
  return format(zoned, 'dd/MM/yyyy HH:mm', { locale: getDateFnsLocale() })
}

export function formatDateShort(date: string | Date): string {
  const zoned = toTz(date)
  return format(zoned, 'dd/MM', { locale: getDateFnsLocale() })
}

export function formatRelativeDate(date: string | Date): string {
  const { locale, timezone } = getLocaleSettings()
  const d = typeof date === 'string' ? new Date(date) : date
  const zoned = toZonedTime(d, timezone)
  const now = toZonedTime(new Date(), timezone)
  const diff = now.getTime() - zoned.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    const labels: Record<string, string> = { 'pt-BR': 'agora', en: 'now', es: 'ahora' }
    return labels[locale] ?? 'now'
  }
  if (minutes < 60) return `${minutes}min`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return format(zoned, 'dd/MM', { locale: getDateFnsLocale(locale) })
}

export function formatCurrency(value: number): string {
  const { locale, currency } = getLocaleSettings()
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  const { locale, currency } = getLocaleSettings()
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  const { locale } = getLocaleSettings()
  return new Intl.NumberFormat(locale).format(value)
}

export function formatDateSeparator(date: string | Date): string {
  const { locale, timezone } = getLocaleSettings()
  const zoned = toTz(date, timezone)

  if (isToday(zoned)) {
    const labels: Record<string, string> = { 'pt-BR': 'Hoje', en: 'Today', es: 'Hoy' }
    return labels[locale] ?? 'Today'
  }
  if (isYesterday(zoned)) {
    const labels: Record<string, string> = { 'pt-BR': 'Ontem', en: 'Yesterday', es: 'Ayer' }
    return labels[locale] ?? 'Yesterday'
  }
  return format(zoned, 'dd MMM yyyy', { locale: getDateFnsLocale(locale) })
}
