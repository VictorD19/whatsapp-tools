import { z } from 'zod'

export const UpdatePreferenceSchema = z.object({
  inApp: z.boolean(),
  browser: z.boolean(),
})

export type UpdatePreferenceDto = z.infer<typeof UpdatePreferenceSchema>
