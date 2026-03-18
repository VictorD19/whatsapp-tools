export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  apiKey?: string
}

export interface ChatResponse {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
}

export interface ILLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
  stream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncIterable<string>
  embed(text: string, apiKey?: string): Promise<number[]>
}
