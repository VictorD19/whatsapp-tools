import { z } from 'zod'

export const moveDealSchema = z.object({
  stageId: z.string().min(1, 'stageId e obrigatorio'),
  lostReason: z.string().optional(),
})

export type MoveDealDto = z.infer<typeof moveDealSchema>
