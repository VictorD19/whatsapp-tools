import { z } from 'zod'

export const SetConversationAssistantSchema = z.object({
  assistantId: z.string().cuid().nullable(),
})
export type SetConversationAssistantDto = z.infer<typeof SetConversationAssistantSchema>
