import { z } from 'zod'

export const tenantFiltersSchema = z.object({
  search: z.string().optional(),
  planId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type TenantFiltersDto = z.infer<typeof tenantFiltersSchema>
