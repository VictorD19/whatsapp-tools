import { z } from 'zod'

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Mensagem não pode ser vazia').max(4096),
})

export type SendMessageDto = z.infer<typeof sendMessageSchema>
