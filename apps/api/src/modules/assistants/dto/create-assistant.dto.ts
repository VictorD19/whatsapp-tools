import { z } from 'zod'

export const CreateAssistantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().min(1).optional(),
  avatarEmoji: z.string().max(10).optional(),
  model: z.string().default('gpt-4o-mini'),
  systemPrompt: z.string().default(''),
  waitTimeSeconds: z.number().int().min(1).max(60).default(5),
  isActive: z.boolean().default(true),
  handoffKeywords: z.array(z.string()).default([]),
})

export type CreateAssistantDto = z.infer<typeof CreateAssistantSchema>
