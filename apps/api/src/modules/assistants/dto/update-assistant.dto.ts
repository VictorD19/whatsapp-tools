import { z } from 'zod'
import { CreateAssistantSchema } from './create-assistant.dto'

export const UpdateAssistantSchema = CreateAssistantSchema.partial()
export type UpdateAssistantDto = z.infer<typeof UpdateAssistantSchema>
