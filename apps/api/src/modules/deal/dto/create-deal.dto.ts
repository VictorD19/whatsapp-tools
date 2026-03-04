import { z } from 'zod'

export const createDealSchema = z.object({
  contactId: z.string().min(1, 'contactId e obrigatorio'),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  title: z.string().optional(),
  value: z.number().min(0).optional(),
  conversationId: z.string().optional(),
})

export type CreateDealDto = z.infer<typeof createDealSchema>
