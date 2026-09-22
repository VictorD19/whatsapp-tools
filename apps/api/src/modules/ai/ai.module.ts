import { Module } from '@nestjs/common'
import { LLM_PROVIDER, SPEECH_TO_TEXT, TEXT_TO_SPEECH, VOICE_CLONING } from './ai.tokens'
import { OpenAIAdapter } from './adapters/openai/openai.adapter'
import { OpenAISTTAdapter } from './adapters/openai/openai-stt.adapter'
import { EdgeTTSAdapter } from './adapters/edge-tts/edge-tts.adapter'
import { ElevenLabsAdapter } from './adapters/elevenlabs/elevenlabs.adapter'
import { ElevenLabsHttpClient } from './adapters/elevenlabs/elevenlabs-http.client'
import { TtsRouterService } from './tts-router.service'

export { LLM_PROVIDER, SPEECH_TO_TEXT, TEXT_TO_SPEECH, VOICE_CLONING }

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
    EdgeTTSAdapter,
    ElevenLabsHttpClient,
    ElevenLabsAdapter,
    {
      // Roteia entre Edge TTS e ElevenLabs conforme a voz escolhida.
      provide: TEXT_TO_SPEECH,
      useClass: TtsRouterService,
    },
    {
      provide: VOICE_CLONING,
      useExisting: ElevenLabsAdapter,
    },
  ],
  exports: [LLM_PROVIDER, SPEECH_TO_TEXT, TEXT_TO_SPEECH, VOICE_CLONING],
})
export class AiModule {}
