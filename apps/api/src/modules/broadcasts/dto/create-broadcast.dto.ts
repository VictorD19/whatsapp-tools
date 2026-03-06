import { z } from 'zod'

export const createBroadcastSchema = z.object({
  name: z.string().min(1).max(200),
  instanceIds: z.array(z.string()).min(1),
  contactListIds: z.array(z.string()).default([]),
  groups: z
    .array(
      z.object({
        jid: z.string(),
        name: z.string().optional(),
      }),
    )
    .default([]),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).default('TEXT'),
  messageTexts: z.array(z.string().max(4096)).min(1, 'Adicione pelo menos uma variacao de mensagem'),
  mediaUrl: z.string().url().optional(),
  caption: z.string().max(1024).optional(),
  fileName: z.string().max(255).optional(),
  delay: z.number().int().min(1).max(120).default(5),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
})

export type CreateBroadcastDto = z.infer<typeof createBroadcastSchema>
