import { z } from 'zod'

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  planId: z.string().min(1).optional(),
  adminPassword: z.string().min(6).optional(),
})

export type UpdateTenantDto = z.infer<typeof updateTenantSchema>
