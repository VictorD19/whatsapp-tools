import { z } from 'zod'

export const createStageSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hex valido (#RRGGBB)').default('#6B7280'),
  type: z.enum(['ACTIVE', 'WON', 'LOST']).default('ACTIVE'),
})

export type CreateStageDto = z.infer<typeof createStageSchema>
