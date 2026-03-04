import { z } from 'zod'

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

export const createTagSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(50, 'Nome pode ter no maximo 50 caracteres'),
  color: z.string().regex(hexColorRegex, 'Cor deve estar no formato #RRGGBB').default('#6B7280'),
})

export type CreateTagDto = z.infer<typeof createTagSchema>
