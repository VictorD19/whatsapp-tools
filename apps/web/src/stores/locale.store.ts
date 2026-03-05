import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocaleState {
  locale: string
  timezone: string
  currency: string
  setLocaleSettings: (settings: { locale?: string; timezone?: string; currency?: string }) => void
  reset: () => void
}

const defaultSettings = {
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setLocaleSettings: (settings) =>
        set((state) => ({
          locale: settings.locale ?? state.locale,
          timezone: settings.timezone ?? state.timezone,
          currency: settings.currency ?? state.currency,
        })),
      reset: () => set(defaultSettings),
    }),
    {
      name: 'locale-storage',
    },
  ),
)
