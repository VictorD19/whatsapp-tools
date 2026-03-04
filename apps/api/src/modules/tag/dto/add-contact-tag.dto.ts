import { z } from 'zod'

export const addContactTagSchema = z.object({
  tagId: z.string().min(1, 'tagId e obrigatorio'),
})

export type AddContactTagDto = z.infer<typeof addContactTagSchema>
