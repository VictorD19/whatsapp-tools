import { z } from 'zod'

export const userFiltersSchema = z.object({
  role: z.enum(['admin', 'agent', 'viewer']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false),
})

export type UserFiltersDto = z.infer<typeof userFiltersSchema>
