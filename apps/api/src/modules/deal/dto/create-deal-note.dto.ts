import { z } from 'zod'

export const createDealNoteSchema = z.object({
  content: z.string().min(1, 'Conteudo da nota e obrigatorio'),
})

export type CreateDealNoteDto = z.infer<typeof createDealNoteSchema>
