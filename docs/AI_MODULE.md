# Módulo de IA — Checklist de Implementação

> Documento de referência para implementação do módulo de Assistentes Virtuais.
> Decisões técnicas fixadas em: 2026-03-07

---

## Decisões Técnicas Fixadas

| Decisão | Escolha | Motivo |
|---|---|---|
| LLM (MVP) | Adapter direto OpenAI-compatible | Simples, sem infra extra |
| LLM (v2+) | LiteLLM Proxy + adapter | Multi-provider sem mudar código |
| Abstração | `ILLMProvider` (ports & adapters) | Mesmo padrão do WhatsApp provider |
| RAG / Embeddings | pgvector (PostgreSQL) | Já na stack, sem serviço extra |
| Rich text (instruções) | TipTap | Padrão React, suporta extensões customizadas |
| Debounce mensagens | BullMQ delayed job | Cancela e reagenda a cada nova mensagem |
| Tools | Fixas no código, configuráveis por tenant | Segurança + flexibilidade controlada |
| KBs por assistente | Many-to-many (um assistente pode ter várias KBs) | Flexibilidade de composição |
| Tools por tenant | Biblioteca compartilhada por tenant, vinculadas ao assistente | Reuso entre assistentes |

---

## Estrutura de Menu (Sidebar)

```
IA
├── Assistentes
├── Bases de Conhecimento
└── Tools
```

---

## Estrutura de Arquivos

```
modules/assistants/
├── assistants.module.ts
├── assistants.controller.ts
├── assistants.service.ts
├── assistants.repository.ts
├── dto/
│   ├── create-assistant.dto.ts
│   └── update-assistant.dto.ts
├── entities/
│   └── assistant.entity.ts
├── queues/
│   ├── ai-response.producer.ts
│   └── ai-response.processor.ts
└── __tests__/
    └── assistants.service.spec.ts

modules/knowledge-base/
├── knowledge-base.module.ts
├── knowledge-base.controller.ts
├── knowledge-base.service.ts
├── knowledge-base.repository.ts
├── dto/
│   ├── create-knowledge-base.dto.ts
│   └── create-source.dto.ts
├── queues/
│   ├── ingestion.producer.ts
│   └── ingestion.processor.ts
└── __tests__/
    └── knowledge-base.service.spec.ts

modules/ai-tools/
├── ai-tools.module.ts
├── ai-tools.controller.ts
├── ai-tools.service.ts
├── ai-tools.repository.ts
├── definitions/               ← implementação de cada tool
│   ├── buscar-contato.tool.ts
│   ├── criar-contato.tool.ts
│   ├── adicionar-tag.tool.ts
│   ├── criar-deal.tool.ts
│   ├── transferir-humano.tool.ts
│   └── webhook-externo.tool.ts
├── dto/
│   └── create-ai-tool.dto.ts
└── __tests__/
    └── ai-tools.service.spec.ts

modules/ai/
├── ports/
│   └── llm-provider.interface.ts     ← ILLMProvider (nunca muda)
├── adapters/
│   ├── openai/
│   │   └── openai.adapter.ts         ← MVP: chama Anthropic/OpenAI direto
│   └── litellm/
│       └── litellm.adapter.ts        ← v2: chama LiteLLM Proxy
└── ai.module.ts
```

---

## Schema Prisma

```prisma
// --- ASSISTENTES ---

model Assistant {
  id                 String    @id @default(cuid())
  tenantId           String
  name               String
  description        String?
  avatarUrl          String?
  avatarEmoji        String?   // fallback se não tiver imagem
  model              String    @default("gpt-4o-mini")
  systemPrompt       String    @db.Text  // rich text salvo como HTML/markdown
  waitTimeSeconds    Int       @default(5)  // debounce: tempo após última msg
  isActive           Boolean   @default(true)
  handoffKeywords    String[]  // palavras que ativam transferência para humano

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?

  tenant             Tenant              @relation(fields: [tenantId], references: [id])
  knowledgeBases     AssistantKnowledgeBase[]
  tools              AssistantTool[]
  conversations      Conversation[]      // conversas com este assistente ativo

  @@index([tenantId])
}

// --- BASE DE CONHECIMENTO ---

model KnowledgeBase {
  id          String    @id @default(cuid())
  tenantId    String
  name        String
  description String?
  isActive    Boolean   @default(true)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  sources     KnowledgeSource[]
  assistants  AssistantKnowledgeBase[]

  @@index([tenantId])
}

model KnowledgeSource {
  id              String              @id @default(cuid())
  knowledgeBaseId String
  tenantId        String
  type            KnowledgeSourceType // FILE | URL | TEXT
  name            String
  originalUrl     String?             // se type = URL
  fileKey         String?             // se type = FILE (chave no storage)
  fileMimeType    String?
  status          IngestionStatus     @default(PENDING)
  errorMessage    String?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  knowledgeBase   KnowledgeBase       @relation(fields: [knowledgeBaseId], references: [id])
  chunks          KnowledgeChunk[]

  @@index([knowledgeBaseId])
  @@index([tenantId])
}

model KnowledgeChunk {
  id        String   @id @default(cuid())
  sourceId  String
  tenantId  String
  content   String   @db.Text
  embedding Unsupported("vector(1536)")  // pgvector
  chunkIndex Int

  source    KnowledgeSource @relation(fields: [sourceId], references: [id])

  @@index([sourceId])
  @@index([tenantId])
}

// --- TOOLS ---

model AiTool {
  id          String      @id @default(cuid())
  tenantId    String
  name        String      // nome amigável: "Criar Deal"
  description String      // explicação para o usuário
  type        AiToolType  // enum fixo: BUSCAR_CONTATO, CRIAR_DEAL, etc.
  config      Json        // configuração específica por tipo
  isActive    Boolean     @default(true)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  deletedAt   DateTime?

  tenant      Tenant      @relation(fields: [tenantId], references: [id])
  assistants  AssistantTool[]

  @@index([tenantId])
}

// --- TABELAS DE JUNÇÃO ---

model AssistantKnowledgeBase {
  assistantId     String
  knowledgeBaseId String
  assistant       Assistant     @relation(fields: [assistantId], references: [id])
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id])

  @@id([assistantId, knowledgeBaseId])
}

model AssistantTool {
  assistantId String
  aiToolId    String
  assistant   Assistant @relation(fields: [assistantId], references: [id])
  aiTool      AiTool    @relation(fields: [aiToolId], references: [id])

  @@id([assistantId, aiToolId])
}

// --- ENUMS ---

enum KnowledgeSourceType {
  FILE
  URL
  TEXT
}

enum IngestionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum AiToolType {
  BUSCAR_CONTATO
  CRIAR_CONTATO
  ADICIONAR_TAG
  CRIAR_DEAL
  TRANSFERIR_HUMANO
  WEBHOOK_EXTERNO
}
```

**Adições no model existente `Conversation`:**
```prisma
assistantId       String?
assistantPausedAt DateTime?   // null = IA ativa, preenchida = IA pausada
```

---

## ILLMProvider — Interface Port

```typescript
// modules/ai/ports/llm-provider.interface.ts

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
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>
  embed(text: string): Promise<number[]>   // para gerar embeddings (RAG)
}
```

---

## Fluxo de Resposta da IA (fila ai-response)

```
1. Webhook recebe mensagem do usuário
2. webhook-inbound.processor salva a mensagem no Inbox
3. Verifica se a conversa tem assistantId ativo (não pausado)
4. Se sim: ai-response.producer.enqueue({ conversationId, messageId, tenantId, delay: waitTimeSeconds * 1000 })
5. Se chegar nova mensagem antes do delay: cancela job anterior, agenda novo

ai-response.processor:
  1. Carrega conversa + últimas N mensagens (contexto)
  2. Para cada KB vinculada: busca chunks relevantes via pgvector (top-3 por KB)
  3. Carrega tools ativas do assistente
  4. Monta prompt:
     - system: systemPrompt do assistente + chunks de KB como contexto + definição das tools
     - messages: histórico da conversa
  5. Chama ILLMProvider.chat()
  6. Se resposta contém tool call: executa a tool → continua a conversa
  7. Salva resposta como Message (fromMe: true, senderType: 'assistant')
  8. Envia via WhatsApp (IWhatsAppProvider)
  9. Emite WebSocket conversation:new_message
```

---

## Fluxo de Ingestão de KB (fila kb-ingestion)

```
1. Usuário faz upload/cadastro de fonte
2. KnowledgeSource criado com status PENDING
3. kb-ingestion.producer.enqueue({ sourceId, tenantId })

kb-ingestion.processor:
  FILE:
    1. Download do storage
    2. Extração de texto (pdf-parse, mammoth para DOCX, etc.)
    3. Chunking (500 tokens, overlap 50)
    4. Para cada chunk: ILLMProvider.embed(chunk) → salva KnowledgeChunk
    5. Status → COMPLETED

  URL:
    1. Fetch da URL + extração de texto (cheerio)
    2. Mesmo fluxo de chunking + embedding

  TEXT:
    1. Texto já disponível
    2. Mesmo fluxo de chunking + embedding
```

---

## Tools — Tipos e Configuração

| Type | Config (JSON) | O que executa |
|---|---|---|
| `BUSCAR_CONTATO` | `{}` | Busca contato pelo número no CRM |
| `CRIAR_CONTATO` | `{}` | Cria novo contato com dados coletados |
| `ADICIONAR_TAG` | `{ tagIds: string[] }` | Adiciona tag(s) ao contato |
| `CRIAR_DEAL` | `{ pipelineId, stageId }` | Cria deal no CRM |
| `TRANSFERIR_HUMANO` | `{ message: string }` | Pausa IA + envia mensagem de transferência |
| `WEBHOOK_EXTERNO` | `{ url, method, headers?, bodyTemplate? }` | Chama URL externa com dados da conversa |

---

## Erros a Registrar em `error-codes.ts`

```
ASSISTANT_NOT_FOUND
ASSISTANT_INACTIVE
KNOWLEDGE_BASE_NOT_FOUND
KNOWLEDGE_SOURCE_INGESTION_FAILED
AI_TOOL_NOT_FOUND
AI_TOOL_EXECUTION_FAILED
LLM_PROVIDER_ERROR
LLM_CONTEXT_TOO_LARGE
```

---

## Checklist Backend

### ILLMProvider
- [ ] Criar interface `ILLMProvider` em `modules/ai/ports/`
- [ ] Implementar `OpenAIAdapter` (MVP — chama Anthropic/OpenAI direto)
- [ ] Registrar no `ai.module.ts` via token `LLM_PROVIDER`
- [ ] Documentar `OPENAI_API_KEY` no `.env.example`
- [ ] Criar estrutura `litellm/` vazia para futura troca

### Schema & Migration
- [ ] Adicionar `assistantId` + `assistantPausedAt` no model `Conversation`
- [ ] Criar models: `Assistant`, `KnowledgeBase`, `KnowledgeSource`, `KnowledgeChunk`, `AiTool`
- [ ] Criar tabelas de junção: `AssistantKnowledgeBase`, `AssistantTool`
- [ ] Criar enums: `KnowledgeSourceType`, `IngestionStatus`, `AiToolType`
- [ ] Habilitar extensão `pgvector` na migration
- [ ] Migration: `20260307_ai_module`

### Módulo Assistants
- [ ] CRUD completo (`assistants.service.ts`)
- [ ] Vincular/desvincular KBs (`POST /assistants/:id/knowledge-bases`)
- [ ] Vincular/desvincular Tools (`POST /assistants/:id/tools`)
- [ ] Endpoint para ativar/pausar IA em conversa (`PATCH /inbox/conversations/:id/assistant`)
- [ ] Testes unitários (`assistants.service.spec.ts`)

### Módulo Knowledge Base
- [ ] CRUD de KnowledgeBase
- [ ] Upload de arquivo → storage → enfileirar ingestão
- [ ] Cadastro de URL → enfileirar ingestão
- [ ] Cadastro de texto livre → enfileirar ingestão
- [ ] `kb-ingestion.processor`: extração + chunking + embedding
- [ ] Endpoint para listar fontes e status de ingestão
- [ ] Testes unitários

### Módulo AI Tools
- [ ] CRUD de AiTool (com validação por `type`)
- [ ] Implementar cada tool em `definitions/`
- [ ] `ToolExecutor` service: recebe tipo + config + contexto → executa → retorna resultado
- [ ] Testes unitários

### Fila ai-response
- [ ] `ai-response.producer`: enfileira com delay (BullMQ), cancela job anterior se existir
- [ ] `ai-response.processor`: fluxo completo (contexto + RAG + tools + LLM + envio)
- [ ] Lógica de debounce: identificar job existente por `conversationId`

### Integração com Inbox
- [ ] webhook-inbound.processor verifica `assistantId` na conversa
- [ ] Enfileira `ai-response` se assistente ativo
- [ ] Mensagens da IA salvas com `senderType: 'assistant'`
- [ ] Handoff: setar `assistantPausedAt` quando tool `TRANSFERIR_HUMANO` executa

---

## Checklist Frontend

### Módulo Assistentes (`/assistants`)
- [ ] Listagem de assistentes com status e avatar
- [ ] Sheet de criação/edição com:
  - [ ] Nome, descrição, avatar (upload de imagem ou emoji)
  - [ ] Seletor de modelo (dropdown com opções fixas: gpt-4o, gpt-4o-mini, etc.)
  - [ ] Wait time (slider ou input numérico em segundos)
  - [ ] Status (toggle ativo/inativo)
  - [ ] Palavras de handoff (input de tags)
  - [ ] Seletor de KBs vinculadas (multi-select)
  - [ ] Seletor de tools vinculadas (multi-select com configuração)
- [ ] Aba de Instruções com editor **TipTap**:
  - [ ] Toolbar completa (bold, italic, lista, etc.)
  - [ ] Mention de tools (`@nome-da-tool`) com highlight
  - [ ] Mention de variáveis (`{{nome_contato}}`, `{{empresa}}`) com highlight
- [ ] Dialog de confirmação de exclusão

### Módulo Bases de Conhecimento (`/assistants/knowledge-bases`)
- [ ] Listagem de KBs com contagem de fontes
- [ ] Sheet de criação/edição de KB (nome, descrição)
- [ ] Dentro da KB: listagem de fontes com status de ingestão (badge: pendente/processando/concluído/erro)
- [ ] Upload de arquivo (PDF, DOCX, TXT) com progress
- [ ] Cadastro de URL
- [ ] Cadastro de texto livre (textarea)
- [ ] Botão de re-ingestão em fontes com erro

### Módulo Tools (`/assistants/tools`)
- [ ] Listagem de tools do tenant
- [ ] Sheet de criação com:
  - [ ] Seletor de tipo (enum fixo com ícones e descrições)
  - [ ] Nome amigável
  - [ ] Formulário dinâmico baseado no tipo selecionado
- [ ] Dialog de confirmação de exclusão

### Integração com Inbox
- [ ] Botão/toggle "IA Ativa" na conversa (header ou sidebar)
  - [ ] Verde = ativa, cinza = pausada
  - [ ] Seletor de qual assistente usar (se tenant tiver múltiplos)
- [ ] Badge visual nas mensagens enviadas pela IA (ícone de robô)
- [ ] Indicador de "IA digitando..." enquanto processa

---

## Variáveis de Ambiente

```env
# IA / LLM
OPENAI_API_KEY=           # MVP: chave da OpenAI ou Anthropic
LLM_DEFAULT_MODEL=gpt-4o-mini

# Storage (para arquivos de KB)
STORAGE_PROVIDER=local    # local | s3
STORAGE_S3_BUCKET=
STORAGE_S3_REGION=
STORAGE_S3_ACCESS_KEY=
STORAGE_S3_SECRET_KEY=
```

---

## Filas a Registrar

| Fila | Responsabilidade |
|---|---|
| `ai-response` | Processar resposta da IA (com debounce) |
| `kb-ingestion` | Ingestão de fontes de conhecimento (chunking + embedding) |

---

*Atualizado em: 2026-03-07*
