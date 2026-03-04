import { z } from 'zod'

export const createContactSchema = z.object({
  phone: z.string().trim().min(1, 'Telefone é obrigatório'),
  name: z.string().trim().optional(),
})

export type CreateContactDto = z.infer<typeof createContactSchema>
