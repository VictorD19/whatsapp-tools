import { z } from 'zod'

export const createContactListSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    description: z.string().trim().optional(),
    contactIds: z.array(z.string().min(1)).optional(),
    phones: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => (data.contactIds && data.contactIds.length > 0) || (data.phones && data.phones.length > 0), {
    message: 'Forneça ao menos um contactId ou phone',
  })

export type CreateContactListDto = z.infer<typeof createContactListSchema>
