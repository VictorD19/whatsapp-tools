import { z } from 'zod'

export const listCalendarEventsSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  assistantId: z.string().optional(),
})

export type ListCalendarEventsDto = z.infer<typeof listCalendarEventsSchema>
