import { z } from 'zod'

export const CreateVoiceSchema = z.object({
  name: z.string().min(1).max(100),
})

export type CreateVoiceDto = z.infer<typeof CreateVoiceSchema>
