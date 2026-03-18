import { z } from 'zod'

export const SetConversationAssistantSchema = z.object({
  paused: z.boolean(),
})
export type SetConversationAssistantDto = z.infer<typeof SetConversationAssistantSchema>
