import { z } from 'zod'

export const updateContactSchema = z.object({
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
})

export type UpdateContactDto = z.infer<typeof updateContactSchema>
