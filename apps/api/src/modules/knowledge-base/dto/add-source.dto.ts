import { z } from 'zod'

export const AddSourceSchema = z.object({
  type: z.enum(['URL', 'TEXT']).optional(),
  name: z.string().min(1).max(200),
  originalUrl: z.string().url().optional(),
  content: z.string().optional(),
})

export type AddSourceDto = z.infer<typeof AddSourceSchema>
