import { z } from 'zod'

export const conversationFiltersSchema = z.object({
  tab: z.enum(['all', 'mine', 'unassigned']).optional(),
  status: z.enum(['PENDING', 'OPEN', 'CLOSE']).optional(),
  assignedToMe: z.coerce.boolean().optional(),
  assignedToId: z.string().optional(),
  instanceId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ConversationFiltersDto = z.infer<typeof conversationFiltersSchema>
