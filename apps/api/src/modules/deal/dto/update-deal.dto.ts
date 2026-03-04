import { z } from 'zod'

export const updateDealSchema = z.object({
  title: z.string().optional(),
  value: z.number().min(0).optional(),
  assignedToId: z.string().nullable().optional(),
})

export type UpdateDealDto = z.infer<typeof updateDealSchema>
