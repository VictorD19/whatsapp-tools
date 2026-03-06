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
  delay: z.number().int().min(1).max(120).default(5),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
})

export type CreateBroadcastDto = z.infer<typeof createBroadcastSchema>

/** Variação de mensagem recebida via multipart. */
export interface VariationInput {
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  text: string
  file?: { buffer: Buffer; mimetype: string; filename: string }
}
