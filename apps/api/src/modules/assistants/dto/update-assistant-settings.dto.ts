import { z } from 'zod'

export const UpdateAssistantSettingsSchema = z.object({
  openaiApiKey: z.string().min(1).max(500).nullable(),
})

export type UpdateAssistantSettingsDto = z.infer<typeof UpdateAssistantSettingsSchema>
