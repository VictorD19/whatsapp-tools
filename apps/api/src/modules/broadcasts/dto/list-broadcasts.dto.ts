import { z } from 'zod'

export const listBroadcastsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'])
    .optional(),
  search: z.string().optional(),
})

export type ListBroadcastsDto = z.infer<typeof listBroadcastsSchema>
