import { z } from 'zod'

export const createContactListSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().optional(),
  contactIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um contato'),
})

export type CreateContactListDto = z.infer<typeof createContactListSchema>
