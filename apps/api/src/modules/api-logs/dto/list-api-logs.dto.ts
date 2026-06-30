import { z } from 'zod'
import { ApiLogType } from '@prisma/client'

export const ListApiLogsSchema = z.object({
  type: z.nativeEnum(ApiLogType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export type ListApiLogsDto = z.infer<typeof ListApiLogsSchema>
