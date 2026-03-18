import { Inject, Injectable } from '@nestjs/common'
import { RedisService } from '@core/redis/redis.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { LoggerService } from '@core/logger/logger.service'
import type { ILLMProvider, ChatMessage } from '@modules/ai/ports/llm-provider.interface'
import { AssistantPromptBuilder } from './assistant-prompt.builder'

// ── Constantes ──────────────────────────────────────────────────────────────

const THREAD_MAX_MESSAGES = 20  // Dispara compressão quando atingir
const THREAD_KEEP_RECENT = 6    // Quantas manter intactas após compressão
const THREAD_REDIS_TTL = 172_800 // 48h em segundos

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
  /** ID do deal ativo quando o thread foi construído (null = sem deal) */
  dealId: string | null
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
    deal?: { id: string; createdAt: Date } | null,
  ): Promise<ConversationThread> {
    const dealId = deal?.id ?? null
    const key = this.redisKey(tenantId, conversationId)
    const cached = await this.redis.getClient().get(key)

    if (cached) {
      const cachedThread = JSON.parse(cached) as ConversationThread

      // Invalida cache se o deal associado mudou (ex: novo deal aberto na conversa)
      if (cachedThread.dealId !== dealId) {
        this.logger.debug(
          `Thread cache invalidated — deal changed (${cachedThread.dealId} → ${dealId}) for conversation ${conversationId}`,
          'ConversationThreadService',
        )
        await this.redis.getClient().del(key)
        // Segue para rebuild abaixo
      } else {
        this.logger.debug(
          `Thread cache hit for conversation ${conversationId}`,
          'ConversationThreadService',
        )
        // Renova TTL a cada acesso — qualquer interação mantém o thread vivo
        await this.redis.getClient().expire(key, THREAD_REDIS_TTL)
        return cachedThread
      }
    }

    this.logger.debug(
      `Thread cache miss — rebuilding from DB for conversation ${conversationId}${deal ? ` (since deal ${deal.id} at ${deal.createdAt.toISOString()})` : ''}`,
      'ConversationThreadService',
    )

    // Reconstrói do banco: apenas mensagens do deal em andamento (desde deal.createdAt)
    // Sem deal: pega as últimas THREAD_KEEP_RECENT mensagens disponíveis
    const { messages } = await this.inboxRepository.findMessages(
      tenantId,
      conversationId,
      1,
      THREAD_KEEP_RECENT,
      deal?.createdAt,
    )

    // findMessages retorna desc — reverte para cronológico
    const orderedMessages = [...messages].reverse()

    const thread: ConversationThread = {
      conversationId,
      tenantId,
      systemPrompt: assistant.systemPrompt,
      // Com deal ativo: apenas mensagens do deal, sem sumário anterior
      summary: dealId ? null : (assistant.aiThreadSummary ?? null),
      messages: orderedMessages.map((m) => ({
        role: m.fromMe ? 'assistant' : 'user',
        content: m.body ?? '',
      })),
      totalMessageCount: orderedMessages.length,
      dealId,
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
    assistant: { name: string; description?: string | null },
    kbContext: string,
    tools: Array<{ name: string; description: string | null }>,
    handoffKeywords: string[],
  ): ChatMessage[] {
    const systemContent = AssistantPromptBuilder.build({
      name: assistant.name,
      description: assistant.description,
      systemPrompt: thread.systemPrompt,
      kbContext,
      tools,
      handoffKeywords,
    })

    const messages: ChatMessage[] = [{ role: 'system', content: systemContent }]

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
