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
  audioResponseMode: z.enum(['never', 'auto', 'always']).default('never'),
  voiceId: z.string().max(100).default('pt-BR-FranciscaNeural'),
  inactivityFlowRules: z.array(
    z.object({
      timeInSeconds: z.coerce.number(),
      actionType: z.enum(['interact', 'close']),
      message: z.string().max(512).optional(),
      allowExecutionAnyTime: z.boolean().default(true),
    })
  ).default([]),
})

export type CreateAssistantDto = z.infer<typeof CreateAssistantSchema>
