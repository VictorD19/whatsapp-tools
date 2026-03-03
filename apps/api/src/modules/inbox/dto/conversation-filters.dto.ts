import { z } from 'zod'

export const conversationFiltersSchema = z.object({
  status: z.enum(['PENDING', 'OPEN', 'CLOSE']).optional(),
  assignedToId: z.string().optional(),
  instanceId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ConversationFiltersDto = z.infer<typeof conversationFiltersSchema>
