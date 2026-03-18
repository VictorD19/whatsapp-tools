# Pesquisa: Assistentes de IA em Plataformas de Vendas/Conversação

> Pesquisa realizada em 2026-03-18 para embasar decisões de arquitetura do módulo de assistentes.

---

## Objetivo

Entender como plataformas similares configuram e integram assistentes de IA no fluxo de conversas de vendas/atendimento, para decidir a melhor abordagem para o WhatsApp Sales Platform.

---

## 3 Modelos de Integração Identificados

| Modelo | Plataformas | Descrição |
|---|---|---|
| **IA standalone** (agente autônomo) | Intercom, Zendesk, Tidio, HubSpot | IA opera independente no canal, separada do flow builder |
| **IA como bloco dentro de flows** | ManyChat, Typebot, Landbot | IA é um nó dentro do fluxo visual drag-and-drop |
| **Híbrido (ambos)** | Botpress, HubSpot, Zendesk Advanced | IA autônoma + embeddable como step em flows determinísticos |

---

## Análise por Plataforma

### 1. Intercom (Fin AI Agent)

**Configuração:**
- Tom de voz (profissional, amigável, humorístico)
- Controle de tamanho de resposta (conciso a detalhado)
- **"Guidance"**: instruções comportamentais em linguagem natural
- **"Procedures"**: tarefas multi-step (ex: processar reembolso passo a passo)
- Suporte a 45+ idiomas automaticamente

**Flow vs IA:**
- Fin é **integrado aos Workflows** — pode ser colocado como step dentro de um workflow
- Fin responde primeiro por padrão nos canais configurados
- Se um humano entra, Fin recua automaticamente

**Escalação/Handoff:**
- Regras determinísticas (baseadas em dados do cliente: "Se plano = Enterprise, escalar")
- Guidance em linguagem natural ("Se mencionar reembolso, escalar")
- Detecção automática: cliente pede humano, frustração, loops repetitivos
- Contexto completo passado para o agente humano

**Knowledge Base:**
- Help Center articles, docs internos, PDFs, URLs públicas, snippets
- Knowledge Hub com regras de audiência
- Conteúdo pode ser segmentado por marca/audiência

**Actions/Tools:**
- Templates de ação para conectar sistemas externos (criar tickets, atualizar registros)
- Instruções em linguagem natural sobre quando usar cada ação
- Pode taguear conversas, atualizar dados do cliente

**Multi-assistente:** Não — personalidade única por workspace

**Foco:** Primariamente suporte; qualificação de vendas possível via Procedures mas não é nativo.

---

### 2. Drift / Salesloft

**Configuração:**
- "Playbooks": fluxos conversacionais scripted
- Bionic Chatbots treinados na marca e conteúdo do site
- Integrado à plataforma Salesloft (desde aquisição em 2024)

**Flow vs IA:**
- Híbrido: playbooks rule-based + respostas AI-driven
- AI Chat Agent lida com primeiro contato, outreach SDR, agendamento

**Escalação/Handoff:**
- Routing automático para vendedor baseado em qualificação
- Integração com calendário para booking direto
- Transição seamless de bot para rep ao vivo

**Vendas:**
- Purpose-built para geração de pipeline
- Qualificação de leads, booking de reuniões, atribuição de pipeline
- Syncs com cadences e analytics do Salesloft

**Preço:** $2.500+/mês — produto enterprise

---

### 3. ManyChat

**Configuração:**
- **AI Step**: bloco dentro do flow builder — não é agente standalone
- Configura por step: descrição do objetivo, contexto de negócio, tom, idioma
- **AI Knowledge**: fonte centralizada de conhecimento do negócio

**Flow vs IA:**
- IA é **embedded dentro de flows** como tipo de step
- Flow builder visual tradicional (node-based) com AI Steps como um tipo de nó
- AI Flow Builder Assistant gera flows inteiros a partir de descrição em linguagem natural
- **Intention Recognition** detecta intenção da mensagem e roteia para o flow correto

**Escalação/Handoff:**
- Flow-based: AI Step pode sair para um nó de "handoff"
- Interface de Live Chat para takeover humano
- Transferência automática quando query muito complexa

**Knowledge Base:**
- AI Knowledge: fonte centralizada (info da empresa, produtos, FAQs)
- Adicionada separadamente dos flows; referenciada pelos AI Steps

**Actions/Tools:**
- Ações de flow: taguear contatos, setar custom fields, enviar para CRM via integrações
- Integrações Zapier/Make
- **Sem** tool calling nativo pela IA (ações são definidas no flow, não decididas pela IA)

**Multi-assistente:** Não — diferentes flows servem diferentes propósitos

**Preço:** $29/mês add-on de IA

---

### 4. Botpress

**Configuração:**
- **Autonomous Nodes**: instruções em linguagem natural definindo comportamento do agente
- Prompt por nó: personalidade, escopo, propósito, restrições
- Engine LLMz coordena comportamento, memória, seleção de tools, execução de código
- Flow builder visual com standard nodes + autonomous nodes

**Flow vs IA:**
- **Modelo híbrido mais avançado** de todas as plataformas
- **Standard Nodes**: determinísticos, sequenciais (top-to-bottom)
- **Autonomous Nodes**: LLM decide quais ações tomar e em que ordem
- Dev escolhe **por nó** se é scripted ou AI-driven
- **Agent Router** orquestra múltiplos agentes especializados

**Escalação/Handoff:**
- HITL (Human-in-the-Loop) para escalação em tempo real
- Triggers: incerteza na KB, frustração detectada, info sensível necessária
- Assignment baseado em disponibilidade ou expertise
- Contexto completo preservado

**Knowledge Base:**
- Multimodal: texto, PDFs, imagens (lê tabelas em screenshots)
- Website crawling, upload de documentos
- Card "Query Knowledge Base" usável em autonomous nodes
- Escoped por bot ou compartilhada

**Actions/Tools:**
- Definições customizadas de tools (funções) por autonomous node
- Exemplos: `get_weather`, `create_ticket_in_zendesk`, `create_lead`
- **IA decide quando chamar tools** baseada no contexto da conversa
- API integrations, webhooks, execução de código custom

**Multi-assistente:**
- **Agent Router** habilita orquestração multi-agente
- Cada agente com knowledge, tools e personalidade diferentes
- Output de um agente vira input de outro

---

### 5. Typebot

**Configuração:**
- **Bloco OpenAI** dentro do flow builder visual
- System prompt define papel e tom
- Thread ID mantém histórico de conversa entre mensagens

**Flow vs IA:**
- IA é **um tipo de bloco** dentro do flow — não é agente standalone
- 45+ building blocks: Bubble, Input, Logic, Integration (incluindo OpenAI)
- Bloco de IA ao lado de lógica condicional, coleta de dados, webhooks
- **Sem** conceito de agente autônomo

**Escalação:** Sem handoff nativo — precisa de integração externa

**Knowledge Base:** Sem KB nativa — contexto via system prompt

**Actions/Tools:** Webhooks, Google Sheets, Zapier/Make — sem tool calling pela IA

**Multi-assistente:** Múltiplos blocos OpenAI com system prompts diferentes possíveis

**Destaque:** Open source, self-hostable

---

### 6. Landbot

**Configuração:**
- Flow builder visual drag-and-drop
- AI Agent powered by GPT para NLU
- KB com upload de PDF, texto, ou crawling de URL
- Chunks de tópico único para precisão de retrieval

**Flow vs IA:**
- **Sistema de 3 camadas**: bot rule-based → AI agent → agente humano
- Define quando cada camada entra no flow
- AI agent pode ser um step dentro de um flow maior

**Escalação/Handoff:**
- Bloco "Human takeover" no flow builder
- Assignment para agente específico ou auto-select (menos ocupado)
- Histórico completo + dados coletados visíveis ao agente
- Notificações Slack/Zendesk no handoff

**Knowledge Base:**
- PDF upload, texto, URL crawling
- Terminologia uniforme enforced
- Monitorar conversas e adicionar Q&A que faltam

---

### 7. Zendesk (AI Agents)

**Configuração:**
- **Essential**: IA generativa a partir da KB (simples)
- **Advanced**: flows conversacionais híbridos (scripted + IA generativa no mesmo flow)
- **Action Builder**: tool no-code para automações
- **Knowledge Builder**: IA auto-cria KB a partir de tickets passados

**Flow vs IA:**
- Essential: agente IA puro respondendo da KB
- Advanced: flows híbridos (scripted + generativo no mesmo flow)
- Action flows podem ser triggered por AI agents durante conversas
- **Ambos coexistem**

**Escalação:** IA roteia para times humanos baseado em intent, idioma ou entidades detectadas

**Knowledge Base:**
- Knowledge Builder auto-gera de histórico de tickets
- **Knowledge Connectors**: Confluence, Google Drive, SharePoint (sem migração)

**Multi-assistente:** Múltiplos AI agents possíveis por canal/marca

---

### 8. HubSpot (Breeze)

**Configuração:**
- Conectado a KB articles do HubSpot, URLs públicas
- Respostas baseadas em confiança: alta = responde, baixa = pergunta follow-up, nenhuma = escala
- Actions conectam apps externos via API
- CRM-nativo (configurado dentro do ecossistema HubSpot)

**Flow vs IA:**
- **Customer Agent**: standalone — responde autonomamente nos canais atribuídos
- **Também** pode ser triggered como step dentro de HubSpot Workflows
- Separado dos chatbot flows tradicionais do HubSpot

**Escalação:**
- Transferir imediatamente, após delay, ou manter com agente
- Rotear tickets para pessoas/times específicos baseado em expertise
- Audit card mostra exatamente quais ações o agente executou

**Actions/Tools:**
- API calls para apps externos (checar status de pedido, resetar senha)
- Modificação de properties do CRM (identifica clientes, qualifica leads, atualiza campos)
- Audit trail para todas as ações da IA

**Multi-assistente:**
- **Breeze Studio**: 20+ agentes e assistentes
- Agentes especializados: Customer Agent, **Prospecting Agent**, Content Agent, Social Media Agent
- Assistentes customizáveis no Breeze Studio

**Vendas:**
- **Prospecting Agent**: BDR dedicado — monitora sinais de compra, pesquisa contas, personaliza outreach
- Qualificação de leads e atualização de CRM properties
- Integração com booking de reuniões
- Atribuição de pipeline e revenue

---

### 9. Tidio (Lyro AI)

**Configuração:**
- Dashboard Hub: métricas de performance, quota de uso
- Seção Configure: tom de voz (amigável, neutro, formal), regras de handoff
- Knowledge score monitorando completude da base
- Scoping de knowledge por audiência

**Flow vs IA:**
- Lyro opera **ao lado** do flow builder visual (sistemas paralelos, não integrados)
- Flow builder para chatbots rule-based; Lyro para respostas AI-powered
- Define quais audiências recebem Lyro vs flows vs humano direto

**Knowledge Base:**
- Scanning de URL (página ou site inteiro)
- Auto-extração em pares Q&A
- Criação manual de Q&A
- Métrica de knowledge score

**Vendas:** Foco e-commerce (Shopify), 67% taxa média de automação

---

### 10. Crisp

**Configuração:**
- Flow builder visual no-code com drag-and-drop
- 3 tipos de blocos: Events (triggers), Actions (respostas/updates), Conditions (if/then)
- IA busca respostas em help docs

**Flow vs IA:**
- **Sistemas separados**: chatbot builder (rule-based) + IA que busca docs
- IA augmenta o chatbot, não substitui flows

**Vendas:** Qualificação de leads via perguntas do chatbot, routing por equipe

---

## Padrões Universais Identificados

### Configuração do Assistente (todas as plataformas)

1. **System prompt / personalidade** — tom, idioma, restrições
2. **Knowledge base** — o que a IA sabe (docs, URLs, Q&A)
3. **Actions/tools** — o que a IA pode fazer (tags, CRM, webhooks)
4. **Guardrails** — regras de escalação, tópicos proibidos
5. **Triggers** — quando a IA responde (canal, audiência, condições)

### Triggers de Handoff para Humano (comuns a todas)

1. Cliente pede humano explicitamente
2. IA não encontra resposta / baixa confiança
3. Frustração ou sentimento negativo detectado
4. Loop repetitivo detectado
5. Tópico sensível (billing, jurídico, reclamação)

### Níveis de Tool Calling

| Nível | Plataformas | Capacidade |
|---|---|---|
| Sem actions pela IA | Typebot, Crisp | Ações definidas apenas no flow |
| Actions básicas | ManyChat, Tidio, Landbot | Tag, update fields, webhook |
| AI-driven actions | Intercom, Botpress, HubSpot, Zendesk | IA decide quando chamar tools/APIs |

### Multi-assistente

| Abordagem | Plataformas |
|---|---|
| Sem multi-assistente | ManyChat, Typebot, Crisp, Tidio |
| Workspaces separados por persona | Intercom |
| Agent Router / orquestração | Botpress, HubSpot (Breeze Studio) |

---

## Recomendação para o WhatsApp Sales Platform

Baseado na pesquisa, o **modelo híbrido (Botpress/HubSpot)** é o mais adequado:

### MVP (atual — já implementado)
- Assistente de IA autônomo na conversa (prompt + KB + tools)
- Ativação/pausa/troca por conversa
- Debounce de mensagens com BullMQ
- Tools pré-definidas (BUSCAR_CONTATO, CRIAR_DEAL, TRANSFERIR_HUMANO, etc.)

### Fase 2 (próxima evolução)
- Múltiplos assistentes especializados (vendas, suporte, onboarding)
- Knowledge bases segmentadas por assistente
- Regras de escalação configuráveis (determinísticas + linguagem natural)
- Agent Router para orquestrar assistentes por contexto

### Fase 3 (v2.5+ — Flow Builder Visual)
- Construtor drag-and-drop onde o assistente de IA é **um dos blocos**
- Coexistência de blocos determinísticos (condições, coleta de dados, webhooks) com blocos de IA autônoma
- Modelo Botpress: dev escolhe **por nó** se é scripted ou AI-driven
- O assistente não é substituído pelo flow — o flow **incorpora** o assistente

### Princípio Arquitetural

> O assistente de IA é a unidade base. O flow builder é uma camada de orquestração acima dele.
> Primeiro o assistente funciona bem sozinho. Depois o flow builder permite compor assistentes com lógica determinística.

---

## Fontes

- [Intercom Fin AI Agent](https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained)
- [Intercom Fin in Workflows](https://www.intercom.com/help/en/articles/10032299-use-fin-ai-agent-in-workflows)
- [Intercom Escalation Rules](https://www.intercom.com/help/en/articles/12396892-manage-fin-ai-agent-s-escalation-guidance-and-rules)
- [Intercom Fin 3 Blog](https://www.intercom.com/blog/whats-new-with-fin-3/)
- [Drift/Salesloft Platform](https://www.salesloft.com/platform/drift)
- [Drift Bionic Chatbots](https://www.salesloft.com/platform/drift/bionic-chatbots)
- [ManyChat AI Step](https://help.manychat.com/hc/en-us/articles/14281187288860-Manychat-AI-Step)
- [ManyChat AI Knowledge](https://help.manychat.com/hc/en-us/articles/25626595060124-Manychat-AI-Knowledge)
- [Botpress Autonomous Node](https://ecbctech.com/building-ai-agents-with-botpress-autonomous-node/)
- [Botpress Knowledge Bases](https://botpress.com/features/knowledge-bases)
- [Botpress Human Handoff](https://botpress.com/features/human-handoff)
- [Botpress Agent Orchestration](https://botpress.com/blog/ai-agent-orchestration)
- [Typebot OpenAI Block](https://docs.typebot.io/editor/blocks/integrations/openai)
- [Landbot AI Agent](https://landbot.io/ai-agent-chatbots)
- [Zendesk AI Agents](https://support.zendesk.com/hc/en-us/articles/6970583409690-About-AI-agents)
- [Zendesk AI Advanced](https://www.demeterict.com/en/zendesk-updates-en/zendesk-ai-agent-advanced-review-2025-features-pros-and-limitations/)
- [HubSpot Customer Agent](https://knowledge.hubspot.com/customer-agent/create-a-customer-agent)
- [HubSpot Breeze AI 2026](https://www.onthefuze.com/hubspot-insights-blog/hubspot-breeze-ai-agents-2026)
- [Tidio Lyro AI](https://help.tidio.com/hc/en-us/articles/9003475527196-Lyro-the-conversational-AI-agent)
- [Crisp AI Chatbot](https://crisp.chat/en/chatbot/)
