import { z } from 'zod'

export const importConversationsSchema = z.object({
  messageLimit: z.coerce.number().int().min(1).max(200).default(50),
})

export type ImportConversationsDto = z.infer<typeof importConversationsSchema>
