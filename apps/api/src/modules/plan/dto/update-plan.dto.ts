import { z } from 'zod'

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  benefits: z.array(z.string()).optional(),
  maxInstances: z.coerce.number().int().min(1).optional(),
  maxUsers: z.coerce.number().int().min(1).optional(),
  maxAssistants: z.coerce.number().int().min(0).optional(),
  maxBroadcastsPerDay: z.coerce.number().int().min(0).optional(),
  maxContactsPerBroadcast: z.coerce.number().int().min(0).optional(),
  price: z.coerce.number().min(0).nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
})

export type UpdatePlanDto = z.infer<typeof updatePlanSchema>
