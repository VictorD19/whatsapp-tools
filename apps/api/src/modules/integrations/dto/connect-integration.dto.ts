import { z } from 'zod'

export const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

export type GoogleCallbackDto = z.infer<typeof googleCallbackSchema>
