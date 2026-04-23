import { z } from 'zod'

export const updateInstanceSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nome deve conter apenas letras, números, _ ou -')
    .optional(),
  defaultAssistantId: z
    .string()
    .cuid('ID de assistente inválido')
    .nullable()
    .optional(),
})

export type UpdateInstanceDto = z.infer<typeof updateInstanceSchema>
