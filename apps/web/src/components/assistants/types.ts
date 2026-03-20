export interface Assistant {
  id: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  avatarEmoji?: string | null
  model: string
  systemPrompt: string
  waitTimeSeconds: number
  isActive: boolean
  handoffKeywords: string[]
  audioResponseMode: 'never' | 'auto' | 'always'
  voiceId: string
  knowledgeBases: Array<{ knowledgeBaseId: string; knowledgeBase: { id: string; name: string } }>
  tools: Array<{ aiToolId: string; aiTool: { id: string; name: string; type: string } }>
}

export interface KnowledgeBase {
  id: string
  name: string
}

export interface AiTool {
  id: string
  name: string
  type: string
}

export interface ApiResponse<T> {
  data: T
}
