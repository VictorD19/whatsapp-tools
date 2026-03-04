import { z } from 'zod'

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

export const updateTagSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(50, 'Nome pode ter no maximo 50 caracteres').optional(),
  color: z.string().regex(hexColorRegex, 'Cor deve estar no formato #RRGGBB').optional(),
})

export type UpdateTagDto = z.infer<typeof updateTagSchema>
