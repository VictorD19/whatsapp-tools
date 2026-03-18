import { AssistantPromptBuilder } from '../services/assistant-prompt.builder'

describe('AssistantPromptBuilder', () => {
  describe('build', () => {
    it('deve incluir nome do assistente nas instruções básicas', () => {
      const result = AssistantPromptBuilder.build({
        name: 'SDR Bot',
        systemPrompt: '',
      })

      expect(result).toContain('You are SDR Bot')
      expect(result).toContain('BASIC INSTRUCTIONS')
    })

    it('deve incluir descrição quando fornecida', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        description: 'Qualifica leads via WhatsApp',
        systemPrompt: '',
      })

      expect(result).toContain('your role is: Qualifica leads via WhatsApp')
    })

    it('não deve incluir role description quando description é null', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        description: null,
        systemPrompt: '',
      })

      expect(result).not.toContain('your role is')
      expect(result).toContain('You are Bot.')
    })

    it('deve incluir seção de instruções da conversa quando systemPrompt fornecido', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: 'Você é um vendedor especialista em SaaS.',
      })

      expect(result).toContain('CONVERSATION INSTRUCTIONS')
      expect(result).toContain('Você é um vendedor especialista em SaaS.')
    })

    it('não deve incluir seção de instruções quando systemPrompt está vazio', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '   ',
      })

      expect(result).not.toContain('CONVERSATION INSTRUCTIONS')
    })

    it('deve incluir contexto KB quando fornecido', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
        kbContext: 'Plano Pro custa R$ 99/mês',
      })

      expect(result).toContain('base de conhecimento')
      expect(result).toContain('Plano Pro custa R$ 99/mês')
    })

    it('não deve incluir seção KB quando kbContext está vazio', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
        kbContext: '',
      })

      expect(result).not.toContain('base de conhecimento')
    })

    it('deve incluir ferramentas disponíveis quando fornecidas', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
        tools: [
          { name: 'CRIAR_DEAL', description: 'Cria um deal no CRM' },
          { name: 'AGENDAR', description: null },
        ],
      })

      expect(result).toContain('Ferramentas disponíveis')
      expect(result).toContain('CRIAR_DEAL')
      expect(result).toContain('Cria um deal no CRM')
      expect(result).toContain('AGENDAR')
      expect(result).toContain('[TOOL:TIPO]')
    })

    it('não deve incluir seção de tools quando lista está vazia', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
        tools: [],
      })

      expect(result).not.toContain('Ferramentas disponíveis')
    })

    it('deve incluir instrução de handoff quando keywords fornecidas', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
        handoffKeywords: ['humano', 'atendente', 'pessoa'],
      })

      expect(result).toContain('humano')
      expect(result).toContain('atendente')
      expect(result).toContain('pessoa')
      expect(result).toContain('falar com um humano')
    })

    it('não deve incluir instrução de handoff quando keywords estão vazias', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
        handoffKeywords: [],
      })

      expect(result).not.toContain('falar com um humano')
    })

    it('deve sempre incluir seção OBSERVATIONS', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
      })

      expect(result).toContain('OBSERVATIONS')
      expect(result).toContain('language used by the user')
    })

    it('deve sempre incluir seção FIXED PARAMETERS com data atual', () => {
      const before = new Date()
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: '',
      })
      const after = new Date()

      expect(result).toContain('FIXED PARAMETERS')
      expect(result).toContain('Current date and time')

      // Extrai a data do prompt e verifica que está dentro do intervalo do teste
      const match = result.match(/Current date and time: (.+)\./)
      expect(match).not.toBeNull()
      const promptDate = new Date(match![1])
      expect(promptDate.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(promptDate.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('deve montar prompt completo com todas as seções', () => {
      const result = AssistantPromptBuilder.build({
        name: 'SDR',
        description: 'Qualifica leads',
        systemPrompt: 'Siga o script de vendas.',
        kbContext: 'Produto X: R$ 100',
        tools: [{ name: 'CRIAR_DEAL', description: 'Cria deal' }],
        handoffKeywords: ['humano'],
      })

      expect(result).toContain('BASIC INSTRUCTIONS')
      expect(result).toContain('CONVERSATION INSTRUCTIONS')
      expect(result).toContain('base de conhecimento')
      expect(result).toContain('Ferramentas disponíveis')
      expect(result).toContain('falar com um humano')
      expect(result).toContain('OBSERVATIONS')
      expect(result).toContain('FIXED PARAMETERS')
    })

    it('deve separar seções com linha em branco dupla', () => {
      const result = AssistantPromptBuilder.build({
        name: 'Bot',
        systemPrompt: 'Instrução',
      })

      expect(result).toContain('\n\n')
    })
  })
})
