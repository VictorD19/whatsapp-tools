import { z } from 'zod'
import { CreateKnowledgeBaseSchema } from './create-knowledge-base.dto'

export const UpdateKnowledgeBaseSchema = CreateKnowledgeBaseSchema.partial()

export type UpdateKnowledgeBaseDto = z.infer<typeof UpdateKnowledgeBaseSchema>
