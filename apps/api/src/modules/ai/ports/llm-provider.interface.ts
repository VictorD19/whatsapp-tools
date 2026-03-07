export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
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
  embed(text: string): Promise<number[]>
}
