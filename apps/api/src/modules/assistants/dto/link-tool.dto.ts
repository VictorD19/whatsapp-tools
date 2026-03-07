import { z } from 'zod'

export const LinkToolSchema = z.object({
  aiToolId: z.string().cuid(),
})
export type LinkToolDto = z.infer<typeof LinkToolSchema>
