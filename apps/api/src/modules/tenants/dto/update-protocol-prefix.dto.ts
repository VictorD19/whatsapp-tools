import { z } from 'zod'

export const updateProtocolPrefixSchema = z.object({
  prefix: z
    .string()
    .min(1, 'Prefixo não pode ser vazio')
    .max(10, 'Prefixo pode ter no máximo 10 caracteres')
    .regex(/^[A-Za-z0-9]+$/, 'Prefixo deve conter apenas letras e números'),
})

export type UpdateProtocolPrefixDto = z.infer<typeof updateProtocolPrefixSchema>
