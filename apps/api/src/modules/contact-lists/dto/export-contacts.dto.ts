import { z } from 'zod'

export const exportContactsSchema = z.object({
  format: z.enum(['csv', 'excel']).default('csv'),
  contactIds: z.array(z.string().min(1)).optional(),
  contactListId: z.string().optional(),
})

export type ExportContactsDto = z.infer<typeof exportContactsSchema>
