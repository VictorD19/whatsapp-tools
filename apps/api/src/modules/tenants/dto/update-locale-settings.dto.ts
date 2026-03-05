import { z } from 'zod'

const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const
const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'ARS', 'CLP', 'MXN', 'COP', 'PEN'] as const

export const updateLocaleSettingsSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  timezone: z
    .string()
    .optional()
    .refine(
      (tz) => {
        if (!tz) return true
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz })
          return true
        } catch {
          return false
        }
      },
      { message: 'Timezone inválido. Use um timezone IANA válido (ex: America/Sao_Paulo)' }
    ),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
})

export type UpdateLocaleSettingsDto = z.infer<typeof updateLocaleSettingsSchema>
