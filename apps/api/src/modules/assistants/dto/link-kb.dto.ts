import { z } from 'zod'

export const LinkKnowledgeBaseSchema = z.object({
  knowledgeBaseId: z.string().cuid(),
})
export type LinkKnowledgeBaseDto = z.infer<typeof LinkKnowledgeBaseSchema>
