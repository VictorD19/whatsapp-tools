import { Inject, Injectable } from '@nestjs/common'
import { RedisService } from '@core/redis/redis.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { LoggerService } from '@core/logger/logger.service'
import type { ILLMProvider, ChatMessage } from '@modules/ai/ports/llm-provider.interface'

// ── Constantes ──────────────────────────────────────────────────────────────

const THREAD_MAX_MESSAGES = 20  // Dispara compressão quando atingir
const THREAD_KEEP_RECENT = 6    // Quantas manter intactas após compressão
const THREAD_REDIS_TTL = 86_400 // 24h em segundos

// ── Tipos internos ──────────────────────────────────────────────────────────

export interface ThreadMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationThread {
  conversationId: string
  tenantId: string
  systemPrompt: string
  summary: string | null
  messages: ThreadMessage[]
  totalMessageCount: number
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ConversationThreadService {
  constructor(
    private readonly redis: RedisService,
    private readonly inboxRepository: InboxRepository,
    @Inject(LLM_PROVIDER)
    private readonly llm: ILLMProvider,
    private readonly logger: LoggerService,
  ) {}

  // ── Carrega thread do Redis ou reconstrói do banco ───────────────────────

  async getOrBuild(
    tenantId: string,
    conversationId: string,
    assistant: { systemPrompt: string; aiThreadSummary?: string | null },
  ): Promise<ConversationThread> {
    const key = this.redisKey(tenantId, conversationId)
    const cached = await this.redis.getClient().get(key)

    if (cached) {
      this.logger.debug(
        `Thread cache hit for conversation ${conversationId}`,
        'ConversationThreadService',
      )
      return JSON.parse(cached) as ConversationThread
    }

    this.logger.debug(
      `Thread cache miss — rebuilding from DB for conversation ${conversationId}`,
      'ConversationThreadService',
    )

    // Reconstrói do banco: busca últimas THREAD_KEEP_RECENT mensagens + sumário salvo
    const { messages } = await this.inboxRepository.findMessages(
      tenantId,
      conversationId,
      1,
      THREAD_KEEP_RECENT,
    )

    // findMessages retorna desc — reverte para cronológico
    const orderedMessages = [...messages].reverse()

    const thread: ConversationThread = {
      conversationId,
      tenantId,
      systemPrompt: assistant.systemPrompt,
      summary: assistant.aiThreadSummary ?? null,
      messages: orderedMessages.map((m) => ({
        role: m.fromMe ? 'assistant' : 'user',
        content: m.body ?? '',
      })),
      totalMessageCount: orderedMessages.length,
    }

    return thread
  }

  // ── Adiciona mensagem ao thread ──────────────────────────────────────────

  appendMessage(thread: ConversationThread, role: 'user' | 'assistant', content: string): void {
    thread.messages.push({ role, content })
    thread.totalMessageCount++
  }

  // ── Verifica e comprime se necessário ────────────────────────────────────

  async maybeCompress(thread: ConversationThread): Promise<boolean> {
    if (thread.messages.length <= THREAD_MAX_MESSAGES) return false

    this.logger.log(
      `Compressing thread for conversation ${thread.conversationId} (${thread.messages.length} msgs)`,
      'ConversationThreadService',
    )

    const toSummarize = thread.messages.slice(0, -THREAD_KEEP_RECENT)
    const keep = thread.messages.slice(-THREAD_KEEP_RECENT)

    const summaryMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Resuma esta conversa de forma concisa, preservando fatos importantes, preferências e decisões do cliente. Seja objetivo e foque em informações acionáveis.',
      },
      ...toSummarize.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    try {
      const response = await this.llm.chat(summaryMessages, { maxTokens: 500 })

      thread.summary = thread.summary
        ? `${thread.summary}\n\n${response.content}`
        : response.content

      thread.messages = keep
    } catch (error) {
      this.logger.error(
        `Thread compression failed for conversation ${thread.conversationId}: ${(error as Error).message}`,
        (error as Error).stack,
        'ConversationThreadService',
      )
      // Não falha — mantém as mensagens como estão
    }

    return true
  }

  // ── Persiste thread no Redis e sumário no banco ──────────────────────────

  async save(thread: ConversationThread, hasCompressed: boolean): Promise<void> {
    const key = this.redisKey(thread.tenantId, thread.conversationId)

    await this.redis.getClient().setex(key, THREAD_REDIS_TTL, JSON.stringify(thread))

    if (hasCompressed && thread.summary) {
      await this.inboxRepository.updateConversationThreadSummary(
        thread.tenantId,
        thread.conversationId,
        thread.summary,
      )
    }
  }

  // ── Monta array de ChatMessage[] para o LLM ──────────────────────────────

  buildLLMMessages(
    thread: ConversationThread,
    kbContext: string,
    tools: Array<{ name: string; description: string | null }>,
    handoffKeywords: string[],
  ): ChatMessage[] {
    const systemParts: string[] = [thread.systemPrompt]

    if (kbContext) {
      systemParts.push(`\n\n## Contexto relevante da base de conhecimento:\n${kbContext}`)
    }

    if (tools.length > 0) {
      const desc = tools.map((t) => `- ${t.name}: ${t.description ?? ''}`).join('\n')
      systemParts.push(
        `\n\n## Ferramentas disponíveis:\n${desc}\n\nPara executar uma ferramenta, inclua [TOOL:TIPO] na sua resposta (ex: [TOOL:CRIAR_DEAL]).`,
      )
    }

    if (handoffKeywords.length > 0) {
      systemParts.push(
        `\n\nSe o usuário pedir para falar com um humano (palavras como: ${handoffKeywords.join(', ')}), transfira o atendimento.`,
      )
    }

    const messages: ChatMessage[] = [{ role: 'system', content: systemParts.join('') }]

    // Injeta sumário de histórico anterior (se existir)
    if (thread.summary) {
      messages.push({
        role: 'system',
        content: `## Resumo da conversa até aqui:\n${thread.summary}`,
      })
    }

    // Mensagens recentes em full
    for (const msg of thread.messages) {
      if (msg.content) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    return messages
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private redisKey(tenantId: string, conversationId: string): string {
    return `thread:${tenantId}:${conversationId}`
  }
}
