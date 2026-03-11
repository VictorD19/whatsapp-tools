import { z } from 'zod'

export const followUpFiltersSchema = z.object({
  status: z.enum(['PENDING', 'NOTIFIED', 'SENT', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type FollowUpFiltersDto = z.infer<typeof followUpFiltersSchema>
