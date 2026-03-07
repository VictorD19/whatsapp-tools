import { Module } from '@nestjs/common'
import { LLM_PROVIDER } from './ai.tokens'
import { OpenAIAdapter } from './adapters/openai/openai.adapter'

export { LLM_PROVIDER }

@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useClass: OpenAIAdapter, // ← trocar aqui para LiteLLMAdapter quando necessario
    },
  ],
  exports: [LLM_PROVIDER],
})
export class AiModule {}
