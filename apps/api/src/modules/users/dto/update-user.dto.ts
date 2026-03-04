import { z } from 'zod'

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  role: z.enum(['admin', 'agent', 'viewer']).optional(),
})

export type UpdateUserDto = z.infer<typeof updateUserSchema>
