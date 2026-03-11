import { z } from 'zod'

export const createFollowUpSchema = z.object({
  type: z.enum(['MESSAGE', 'CALL', 'MEETING', 'PROPOSAL', 'PAYMENT']),
  mode: z.enum(['REMINDER', 'AUTOMATIC']).default('REMINDER'),
  scheduledAt: z.coerce.date().refine((d) => d > new Date(), {
    message: 'scheduledAt must be in the future',
  }),
  message: z.string().max(4096).optional(),
})

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>
