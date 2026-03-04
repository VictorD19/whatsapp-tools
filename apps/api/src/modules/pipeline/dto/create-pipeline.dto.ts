import { z } from 'zod'

export const createPipelineSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100),
})

export type CreatePipelineDto = z.infer<typeof createPipelineSchema>
