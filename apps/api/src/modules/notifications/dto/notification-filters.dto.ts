import { z } from 'zod'

export const NotificationFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
})

export type NotificationFiltersDto = z.infer<typeof NotificationFiltersSchema>
