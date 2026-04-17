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

const ConsultarDisponibilidadeConfig = z.object({
  integrationId: z.string().min(1),
  lookAheadDays: z.number().int().min(1).max(30).default(7),
  slotDurationMinutes: z.number().int().min(15).max(480).default(60),
  workingHours: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      workingDays: z.array(z.number().int().min(1).max(7)),
    })
    .default({ start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] }),
})

const CriarEventoConfig = z.object({
  integrationId: z.string().min(1),
  defaultDurationMinutes: z.number().int().min(15).max(480).default(60),
  defaultLocation: z.string().optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  createMeetLink: z.boolean().default(true),
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
    ConsultarDisponibilidadeConfig,
    CriarEventoConfig,
    z.object({}),
  ]),
  isActive: z.boolean().default(true),
})

export type CreateAiToolDto = z.infer<typeof createAiToolSchema>
