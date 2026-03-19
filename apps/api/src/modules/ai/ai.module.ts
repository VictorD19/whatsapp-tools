import { Module } from '@nestjs/common'
import { LLM_PROVIDER, SPEECH_TO_TEXT, TEXT_TO_SPEECH } from './ai.tokens'
import { OpenAIAdapter } from './adapters/openai/openai.adapter'
import { OpenAISTTAdapter } from './adapters/openai/openai-stt.adapter'
import { EdgeTTSAdapter } from './adapters/edge-tts/edge-tts.adapter'

export { LLM_PROVIDER, SPEECH_TO_TEXT, TEXT_TO_SPEECH }

@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useClass: OpenAIAdapter,
    },
    {
      provide: SPEECH_TO_TEXT,
      useClass: OpenAISTTAdapter,
    },
    {
      provide: TEXT_TO_SPEECH,
      useClass: EdgeTTSAdapter,
    },
  ],
  exports: [LLM_PROVIDER, SPEECH_TO_TEXT, TEXT_TO_SPEECH],
})
export class AiModule {}
