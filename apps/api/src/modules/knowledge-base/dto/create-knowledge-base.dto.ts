import { z } from 'zod'

export const CreateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export type CreateKnowledgeBaseDto = z.infer<typeof CreateKnowledgeBaseSchema>
