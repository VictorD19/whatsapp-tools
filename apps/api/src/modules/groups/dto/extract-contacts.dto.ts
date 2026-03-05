import { z } from 'zod'

export const extractContactsSchema = z.object({
  instanceId: z.string().min(1, 'instanceId é obrigatório'),
  groupIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um grupo'),
  createList: z
    .object({
      name: z.string().trim().min(1, 'Nome da lista é obrigatório'),
      description: z.string().trim().optional(),
    })
    .optional(),
})

export type ExtractContactsDto = z.infer<typeof extractContactsSchema>
