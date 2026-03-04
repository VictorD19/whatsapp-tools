import { z } from 'zod'

export const reorderStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().min(1),
    }),
  ).min(1, 'Lista de estagios nao pode ser vazia'),
})

export type ReorderStagesDto = z.infer<typeof reorderStagesSchema>
