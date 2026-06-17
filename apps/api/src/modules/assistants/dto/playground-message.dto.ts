import { z } from 'zod'

export const PlaygroundMessageSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  model: z.string().default('gpt-4o-mini'),
  systemPrompt: z.string().default(''),
  knowledgeBaseIds: z.array(z.string()).default([]),
  aiToolIds: z.array(z.string()).default([]),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1)
    .max(50),
})

export type PlaygroundMessageDto = z.infer<typeof PlaygroundMessageSchema>
