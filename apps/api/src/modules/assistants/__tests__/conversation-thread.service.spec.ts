import { Test, TestingModule } from '@nestjs/testing'
import {
  ConversationThreadService,
  ConversationThread,
} from '../services/conversation-thread.service'
import { RedisService } from '@core/redis/redis.service'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { LoggerService } from '@core/logger/logger.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeThread(overrides: Partial<ConversationThread> = {}): ConversationThread {
  return {
    conversationId: 'conv-1',
    tenantId: 'tenant-1',
    systemPrompt: 'Você é um assistente de vendas.',
    summary: null,
    messages: [],
    totalMessageCount: 0,
    dealId: null,
    ...overrides,
  }
}

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn(),
  expire: jest.fn(),
}

const mockRedisService = {
  getClient: jest.fn().mockReturnValue(mockRedisClient),
}

const mockInboxRepository = {
  findMessages: jest.fn(),
  updateConversationThreadSummary: jest.fn(),
}

const mockLlm = {
  chat: jest.fn(),
}

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('ConversationThreadService', () => {
  let service: ConversationThreadService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationThreadService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: InboxRepository, useValue: mockInboxRepository },
        { provide: LLM_PROVIDER, useValue: mockLlm },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile()

    service = module.get(ConversationThreadService)
  })

  // ── getOrBuild ─────────────────────────────────────────────────────────────

  describe('getOrBuild', () => {
    const assistant = { systemPrompt: 'Prompt do sistema', aiThreadSummary: null }

    it('deve retornar thread do cache Redis quando existir', async () => {
      const cached: ConversationThread = makeThread({
        summary: 'sumário antigo',
        messages: [{ role: 'user', content: 'Olá' }],
        totalMessageCount: 1,
      })
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cached))

      const result = await service.getOrBuild('tenant-1', 'conv-1', assistant)

      expect(result).toEqual(cached)
      expect(mockInboxRepository.findMessages).not.toHaveBeenCalled()
    })

    it('deve reconstruir thread do banco quando Redis miss', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      // findMessages retorna DESC — assistant (mais recente) primeiro
      mockInboxRepository.findMessages.mockResolvedValue({
        messages: [
          { fromMe: true, body: 'Oi!', sentAt: new Date(2000) },
          { fromMe: false, body: 'Olá', sentAt: new Date(1000) },
        ],
        total: 2,
      })

      const result = await service.getOrBuild('tenant-1', 'conv-1', assistant)

      expect(result.conversationId).toBe('conv-1')
      expect(result.tenantId).toBe('tenant-1')
      expect(result.systemPrompt).toBe(assistant.systemPrompt)
      expect(result.summary).toBeNull()
      expect(result.messages).toHaveLength(2)
      // Após revert DESC→ASC: user (mais antigo) vem primeiro
      expect(result.messages[0].role).toBe('user')
      expect(result.messages[1].role).toBe('assistant')
    })

    it('deve usar sumário salvo ao reconstruir do banco', async () => {
      const assistantWithSummary = {
        systemPrompt: 'Prompt',
        aiThreadSummary: 'Resumo anterior persistido',
      }
      mockRedisClient.get.mockResolvedValue(null)
      mockInboxRepository.findMessages.mockResolvedValue({ messages: [], total: 0 })

      const result = await service.getOrBuild('tenant-1', 'conv-1', assistantWithSummary)

      expect(result.summary).toBe('Resumo anterior persistido')
    })

    it('deve rever a ordem das mensagens (desc → asc)', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      // findMessages retorna desc — mais recente primeiro
      mockInboxRepository.findMessages.mockResolvedValue({
        messages: [
          { fromMe: true, body: 'Resposta', sentAt: new Date(2000) },
          { fromMe: false, body: 'Pergunta', sentAt: new Date(1000) },
        ],
        total: 2,
      })

      const result = await service.getOrBuild('tenant-1', 'conv-1', assistant)

      // Após reverter: Pergunta (user) → Resposta (assistant)
      expect(result.messages[0].content).toBe('Pergunta')
      expect(result.messages[1].content).toBe('Resposta')
    })
  })

  // ── appendMessage ──────────────────────────────────────────────────────────

  describe('appendMessage', () => {
    it('deve adicionar mensagem e incrementar contador', () => {
      const thread = makeThread()

      service.appendMessage(thread, 'user', 'Olá')

      expect(thread.messages).toHaveLength(1)
      expect(thread.messages[0]).toEqual({ role: 'user', content: 'Olá' })
      expect(thread.totalMessageCount).toBe(1)
    })

    it('deve acumular múltiplas mensagens corretamente', () => {
      const thread = makeThread()

      service.appendMessage(thread, 'user', 'Mensagem 1')
      service.appendMessage(thread, 'assistant', 'Resposta 1')
      service.appendMessage(thread, 'user', 'Mensagem 2')

      expect(thread.messages).toHaveLength(3)
      expect(thread.totalMessageCount).toBe(3)
    })
  })

  // ── maybeCompress ──────────────────────────────────────────────────────────

  describe('maybeCompress', () => {
    it('não deve comprimir quando mensagens <= 20', async () => {
      const thread = makeThread({
        messages: Array.from({ length: 10 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `msg ${i}`,
        })),
      })

      const compressed = await service.maybeCompress(thread)

      expect(compressed).toBe(false)
      expect(mockLlm.chat).not.toHaveBeenCalled()
      expect(thread.messages).toHaveLength(10)
    })

    it('deve comprimir quando mensagens > 20', async () => {
      const msgs = Array.from({ length: 25 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `msg ${i}`,
      }))
      const thread = makeThread({ messages: [...msgs] })

      mockLlm.chat.mockResolvedValue({
        content: 'Resumo das primeiras mensagens.',
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
      })

      const compressed = await service.maybeCompress(thread)

      expect(compressed).toBe(true)
      expect(mockLlm.chat).toHaveBeenCalledTimes(1)
      // Mantém apenas as últimas 6
      expect(thread.messages).toHaveLength(6)
      expect(thread.summary).toBe('Resumo das primeiras mensagens.')
    })

    it('deve acumular sumário quando já existia um anterior', async () => {
      const msgs = Array.from({ length: 25 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `msg ${i}`,
      }))
      const thread = makeThread({
        messages: [...msgs],
        summary: 'Sumário anterior.',
      })

      mockLlm.chat.mockResolvedValue({
        content: 'Novo sumário.',
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
      })

      await service.maybeCompress(thread)

      expect(thread.summary).toBe('Sumário anterior.\n\nNovo sumário.')
    })

    it('deve manter mensagens intactas se o LLM falhar', async () => {
      const msgs = Array.from({ length: 25 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `msg ${i}`,
      }))
      const thread = makeThread({ messages: [...msgs] })

      mockLlm.chat.mockRejectedValue(new Error('LLM timeout'))

      const compressed = await service.maybeCompress(thread)

      // Retorna true (tentou comprimir) mas mantém estrutura segura
      expect(compressed).toBe(true)
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  // ── save ───────────────────────────────────────────────────────────────────

  describe('save', () => {
    it('deve salvar thread no Redis', async () => {
      const thread = makeThread()
      mockRedisClient.setex.mockResolvedValue('OK')

      await service.save(thread, false)

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'thread:tenant-1:conv-1',
        172_800,
        JSON.stringify(thread),
      )
    })

    it('deve persistir sumário no banco quando houve compressão', async () => {
      const thread = makeThread({ summary: 'Resumo gerado' })
      mockRedisClient.setex.mockResolvedValue('OK')
      mockInboxRepository.updateConversationThreadSummary.mockResolvedValue({})

      await service.save(thread, true)

      expect(mockInboxRepository.updateConversationThreadSummary).toHaveBeenCalledWith(
        'tenant-1',
        'conv-1',
        'Resumo gerado',
      )
    })

    it('não deve persistir no banco quando não houve compressão', async () => {
      const thread = makeThread({ summary: 'Resumo antigo' })
      mockRedisClient.setex.mockResolvedValue('OK')

      await service.save(thread, false)

      expect(mockInboxRepository.updateConversationThreadSummary).not.toHaveBeenCalled()
    })

    it('não deve persistir no banco quando houve compressão mas sumário é null', async () => {
      const thread = makeThread({ summary: null })
      mockRedisClient.setex.mockResolvedValue('OK')

      await service.save(thread, true)

      expect(mockInboxRepository.updateConversationThreadSummary).not.toHaveBeenCalled()
    })
  })

  // ── buildLLMMessages ───────────────────────────────────────────────────────

  describe('buildLLMMessages', () => {
    it('deve construir mensagens com system prompt e histórico', () => {
      const thread = makeThread({
        messages: [
          { role: 'user', content: 'Quero comprar' },
          { role: 'assistant', content: 'Claro!' },
        ],
      })

      const result = service.buildLLMMessages(thread, { name: 'Bot', description: null }, '', [], [])

      expect(result[0].role).toBe('system')
      expect(result[0].content).toContain(thread.systemPrompt)
      expect(result[1]).toEqual({ role: 'user', content: 'Quero comprar' })
      expect(result[2]).toEqual({ role: 'assistant', content: 'Claro!' })
    })

    it('deve injetar sumário como mensagem system quando existir', () => {
      const thread = makeThread({
        summary: 'Cliente quer produto X',
        messages: [{ role: 'user', content: 'E aí?' }],
      })

      const result = service.buildLLMMessages(thread, { name: 'Bot', description: null }, '', [], [])

      const summaryMsg = result.find(
        (m) => m.role === 'system' && m.content.includes('Resumo da conversa'),
      )
      expect(summaryMsg).toBeDefined()
      expect(summaryMsg!.content).toContain('Cliente quer produto X')
    })

    it('deve incluir contexto KB quando fornecido', () => {
      const thread = makeThread()
      const kbContext = 'Produto X custa R$ 100'

      const result = service.buildLLMMessages(thread, { name: 'Bot', description: null }, kbContext, [], [])

      expect(result[0].content).toContain('base de conhecimento')
      expect(result[0].content).toContain(kbContext)
    })

    it('deve incluir tools e handoff keywords no system prompt', () => {
      const thread = makeThread()
      const tools = [{ name: 'CRIAR_DEAL', description: 'Cria um deal no CRM' }]
      const keywords = ['humano', 'atendente']

      const result = service.buildLLMMessages(thread, { name: 'Bot', description: null }, '', tools, keywords)

      expect(result[0].content).toContain('CRIAR_DEAL')
      expect(result[0].content).toContain('humano')
    })

    it('deve ignorar mensagens com conteúdo vazio', () => {
      const thread = makeThread({
        messages: [
          { role: 'user', content: '' },
          { role: 'assistant', content: 'Oi!' },
        ],
      })

      const result = service.buildLLMMessages(thread, { name: 'Bot', description: null }, '', [], [])

      // Só a msg de assistant deve aparecer (user estava vazio)
      const conversationMsgs = result.filter((m) => m.role !== 'system')
      expect(conversationMsgs).toHaveLength(1)
      expect(conversationMsgs[0].content).toBe('Oi!')
    })
  })
})
