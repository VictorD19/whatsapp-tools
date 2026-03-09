import { z } from 'zod'

export const startConversationSchema = z.object({
  instanceId: z.string().min(1),
  phone: z.string().min(1),
  contactName: z.string().optional(),
  message: z.string().min(1).max(4096),
})

export type StartConversationDto = z.infer<typeof startConversationSchema>
