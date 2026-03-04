import { z } from 'zod'

export const updatePipelineSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100),
})

export type UpdatePipelineDto = z.infer<typeof updatePipelineSchema>
