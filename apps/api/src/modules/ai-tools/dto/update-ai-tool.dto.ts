import { createAiToolSchema } from './create-ai-tool.dto'

export const updateAiToolSchema = createAiToolSchema.partial()

export type UpdateAiToolDto = Partial<import('./create-ai-tool.dto').CreateAiToolDto>
