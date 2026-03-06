import { useCallback } from 'react'
import { useLocaleStore } from '@/stores/locale.store'
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatDateShort,
  formatRelativeDate,
  formatCurrency,
  formatCurrencyCompact,
  getCurrencySymbol,
  formatNumber,
  formatDateSeparator,
} from '@/lib/formatting'

export function useFormatting() {
  const { locale, timezone, currency } = useLocaleStore()

  return {
    locale,
    timezone,
    currency,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatDate: useCallback((date: string | Date, pattern?: string) => formatDate(date, pattern), [locale, timezone]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatTime: useCallback((date: string | Date) => formatTime(date), [locale, timezone]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatDateTime: useCallback((date: string | Date) => formatDateTime(date), [locale, timezone]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatDateShort: useCallback((date: string | Date) => formatDateShort(date), [locale, timezone]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatRelativeDate: useCallback((date: string | Date) => formatRelativeDate(date), [locale, timezone]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatCurrency: useCallback((value: number) => formatCurrency(value), [locale, currency]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatCurrencyCompact: useCallback((value: number) => formatCurrencyCompact(value), [locale, currency]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    getCurrencySymbol: useCallback(() => getCurrencySymbol(), [locale, currency]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatNumber: useCallback((value: number) => formatNumber(value), [locale]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    formatDateSeparator: useCallback((date: string | Date) => formatDateSeparator(date), [locale, timezone]),
  }
}
