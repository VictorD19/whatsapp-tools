import { z } from 'zod'

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100),
  slug: z
    .string()
    .min(1, 'Slug e obrigatorio')
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve conter apenas letras minusculas, numeros e hifens'),
  description: z.string().max(500).nullable().optional(),
  benefits: z.array(z.string()).default([]),
  maxInstances: z.coerce.number().int().min(1).default(3),
  maxUsers: z.coerce.number().int().min(1).default(5),
  maxAssistants: z.coerce.number().int().min(0).default(1),
  maxBroadcastsPerDay: z.coerce.number().int().min(0).default(5),
  maxContactsPerBroadcast: z.coerce.number().int().min(0).default(500),
  price: z.coerce.number().min(0).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export type CreatePlanDto = z.infer<typeof createPlanSchema>
