import { z } from 'zod'

export const transferConversationSchema = z.object({
  assignedToId: z.string().min(1, 'ID do atendente e obrigatorio'),
})

export type TransferConversationDto = z.infer<typeof transferConversationSchema>
