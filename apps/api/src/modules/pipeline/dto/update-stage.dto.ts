import { z } from 'zod'

export const updateStageSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hex valido (#RRGGBB)').optional(),
  type: z.enum(['ACTIVE', 'WON', 'LOST']).optional(),
})

export type UpdateStageDto = z.infer<typeof updateStageSchema>
