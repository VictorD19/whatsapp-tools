import { z } from 'zod'

export const META_CAPI_EVENTS = [
  'Lead',
  'Contact',
  'Purchase',
  'Schedule',
  'CompleteRegistration',
] as const

export type MetaCapiEventName = (typeof META_CAPI_EVENTS)[number]

export const META_CAPI_TRIGGERS = {
  Lead: 'contact_created',
  Contact: 'conversation_started',
  Purchase: 'deal_won',
  Schedule: 'appointment_confirmed',
  CompleteRegistration: 'contact_created',
} as const satisfies Record<MetaCapiEventName, string>

export const eventRulesSchema = z.record(
  z.enum(META_CAPI_EVENTS),
  z.boolean(),
)

export const upsertMetaCapiConfigSchema = z.object({
  pixelId: z.string().min(1, 'Pixel ID obrigatório'),
  accessToken: z.string().min(1, 'Access Token obrigatório').or(z.literal('_unchanged_')),
  isActive: z.boolean().optional().default(true),
  testEventCode: z.string().optional().nullable(),
  eventRules: eventRulesSchema.optional().default({
    Lead: true,
    Contact: false,
    Purchase: true,
    Schedule: false,
    CompleteRegistration: false,
  }),
})

export type UpsertMetaCapiConfigDto = z.infer<typeof upsertMetaCapiConfigSchema>
export type EventRules = z.infer<typeof eventRulesSchema>
