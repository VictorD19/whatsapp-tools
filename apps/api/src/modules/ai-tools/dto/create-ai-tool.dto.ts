import { z } from 'zod'
import { AiToolType } from '@prisma/client'

const AdicionarTagConfig = z.object({ tagIds: z.array(z.string()).min(1) })
const CriarDealConfig = z.object({ pipelineId: z.string(), stageId: z.string() })
const TransferirHumanoConfig = z.object({ message: z.string().min(1) })
const WebhookExternoConfig = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT']).default('POST'),
  headers: z.record(z.string()).optional(),
  bodyTemplate: z.string().optional(),
})
const SetarEtapaPipelineConfig = z.object({
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
})

export const createAiToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(AiToolType),
  config: z.union([
    AdicionarTagConfig,
    CriarDealConfig,
    TransferirHumanoConfig,
    WebhookExternoConfig,
    SetarEtapaPipelineConfig,
    z.object({}),
  ]),
  isActive: z.boolean().default(true),
})

export type CreateAiToolDto = z.infer<typeof createAiToolSchema>
