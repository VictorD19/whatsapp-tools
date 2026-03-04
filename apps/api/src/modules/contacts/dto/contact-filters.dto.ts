import { z } from 'zod'

export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false),
})

export type ContactFiltersDto = z.infer<typeof contactFiltersSchema>
