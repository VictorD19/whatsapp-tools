import { Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import type {
  ILLMProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
} from '../../ports/llm-provider.interface'

const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL || 'gpt-4o-mini'
const EMBEDDING_MODEL = 'text-embedding-3-small'

@Injectable()
export class OpenAIAdapter implements ILLMProvider {
  private readonly logger = new Logger(OpenAIAdapter.name)
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    const model = options?.model ?? DEFAULT_MODEL

    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
    })

    const choice = response.choices[0]

    return {
      content: choice?.message?.content ?? '',
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    }
  }

  async *stream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncIterable<string> {
    const model = options?.model ?? DEFAULT_MODEL

    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      stream: true,
    })

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield delta
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    })

    return response.data[0].embedding
  }
}
