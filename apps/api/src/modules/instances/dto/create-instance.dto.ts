import { z } from 'zod'

export const createInstanceSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nome deve conter apenas letras, números, _ ou -'),
})

export type CreateInstanceDto = z.infer<typeof createInstanceSchema>
