# WhatsApp Sales Platform — Architecture Rules

> Documento de referência obrigatório. Consultar antes de adicionar qualquer nova funcionalidade.
> Atualizado em: 2026-03-03

---

## 1. Visão Geral

Plataforma SaaS multi-tenant de vendas via WhatsApp.
Arquitetura: **Monorepo + Monolito Modular**.

**Princípios:**
- Cada nova feature é um módulo isolado
- Nenhum módulo acessa diretamente o banco de outro módulo — apenas via service público
- Todo erro é tipado, catalogado e tratado de forma centralizada
- Todo request carrega contexto de tenant — nunca dados cruzam entre tenants
- Filas para tudo que é assíncrono ou pode falhar

---

## 2. Estrutura do Monorepo

```
whatsapp-tools/
├── apps/
│   ├── api/              ← Backend NestJS (monolito modular)
│   └── web/              ← Frontend Next.js
├── packages/
│   ├── database/         ← Prisma schema + client + migrations
│   ├── types/            ← TypeScript types/interfaces compartilhados
│   └── utils/            ← Helpers puros (sem dependências de framework)
├── infra/
│   ├── evolution/        ← Configuração da Evolution API
│   └── nginx/            ← Reverse proxy + SSL
├── docker-compose.yml
├── docker-compose.prod.yml
├── turbo.json
├── package.json          ← workspaces
├── FEATURES.md
└── ARCHITECTURE.md       ← este arquivo
```

**Tooling do Monorepo:**
- Gerenciador: **Turborepo**
- Package manager: **pnpm** (workspaces)
- Build paralelo com cache inteligente via `turbo.json`

---

## 3. Backend — NestJS Modular Monolith

```
apps/api/src/
├── main.ts                        ← bootstrap, pipes globais, swagger
├── app.module.ts                  ← importa CoreModule + todos os módulos
│
├── core/                          ← infraestrutura global (nunca contém regra de negócio)
│   ├── database/
│   │   └── prisma.service.ts
│   ├── redis/
│   │   └── redis.service.ts
│   ├── queue/
│   │   └── queue.module.ts        ← BullMQ setup global
│   ├── logger/
│   │   └── logger.service.ts      ← Pino estruturado
│   ├── errors/
│   │   ├── app.exception.ts       ← classe base de exceção
│   │   ├── error-codes.ts         ← catálogo central de códigos de erro
│   │   └── global-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── tenant.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── response.interceptor.ts ← envelope padrão { data, meta }
│   └── core.module.ts             ← exporta tudo acima como global
│
├── modules/                       ← regras de negócio por domínio
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── instances/
│   ├── contacts/
│   ├── broadcasts/
│   ├── groups/
│   ├── assistants/
│   ├── inbox/
│   ├── crm/
│   └── billing/
│
└── shared/
    ├── decorators/
    │   ├── current-tenant.decorator.ts   ← @CurrentTenant()
    │   └── current-user.decorator.ts     ← @CurrentUser()
    ├── pipes/
    │   └── zod-validation.pipe.ts
    └── types/
        └── tenant-request.interface.ts
```

---

## 4. Estrutura Interna de um Módulo

Todo módulo segue exatamente esta estrutura:

```
modules/exemplo/
├── exemplo.module.ts
├── exemplo.controller.ts
├── exemplo.service.ts
├── exemplo.repository.ts          ← acesso ao banco (Prisma)
├── dto/
│   ├── create-exemplo.dto.ts
│   └── update-exemplo.dto.ts
├── entities/
│   └── exemplo.entity.ts          ← tipo de retorno público do módulo
├── queues/                        ← opcional, se tiver jobs
│   ├── exemplo.producer.ts
│   └── exemplo.processor.ts
└── __tests__/
    ├── exemplo.service.spec.ts
    └── exemplo.controller.spec.ts
```

**Regras do módulo:**
1. O `controller` só chama o `service` — nunca o `repository` diretamente
2. O `service` contém toda a lógica de negócio
3. O `repository` só faz queries — sem lógica de negócio
4. DTOs são validados com **Zod** (via `ZodValidationPipe`)
5. Exports do módulo: apenas o `service` — nunca o `repository`
6. Outros módulos importam o `service` via injeção de dependência — nunca fazem query no banco de outro módulo

---

## 5. Multi-Tenancy

### Modelo: Row-Level Isolation

Todas as tabelas de negócio possuem `tenantId`. Nenhum dado de um tenant é acessível por outro.

### Fluxo de autenticação

```
Login → JWT gerado com { userId, tenantId, role }
       → TenantGuard extrai tenantId do token
       → Injeta no request: req.tenant, req.user
       → @CurrentTenant() disponível em qualquer controller
```

### Regras obrigatórias

- Todo `repository.findMany()` deve incluir `where: { tenantId }` — sem exceção
- O `TenantGuard` é aplicado globalmente — rotas públicas usam `@Public()`
- Nunca confiar em `tenantId` vindo do body/params — sempre extrair do JWT

### Isolamento de instâncias WhatsApp

- Nome da instância na Evolution API: `{tenantSlug}-{instanceName}`
- Webhooks recebidos identificam o tenant pelo prefixo do nome da instância
- Cada tenant tem sua própria cota de instâncias definida pelo plano

---

## 6. Controle de Erros

### Classe base

```typescript
// core/errors/app.exception.ts
throw new AppException('INSTANCE_NOT_CONNECTED', 'A instância não está conectada', {
  instanceId: 'abc123',
})
```

### Catálogo de códigos (`error-codes.ts`)

Todos os erros da aplicação têm código único registrado aqui antes de serem usados.
Formato: `MODULO_DESCRICAO_DO_ERRO`

```
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
TENANT_NOT_FOUND
TENANT_PLAN_LIMIT_REACHED
INSTANCE_NOT_FOUND
INSTANCE_NOT_CONNECTED
INSTANCE_LIMIT_REACHED
BROADCAST_EMPTY_LIST
CONTACT_DUPLICATE
```

### Resposta de erro padronizada

```json
{
  "error": {
    "code": "INSTANCE_NOT_CONNECTED",
    "message": "A instância WhatsApp não está conectada",
    "details": { "instanceId": "abc123" }
  },
  "timestamp": "2026-03-03T12:00:00Z",
  "requestId": "uuid-v4"
}
```

### Resposta de sucesso padronizada

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

### Erros em filas (BullMQ)

- Retry: 3 tentativas com exponential backoff (1s, 5s, 30s)
- Após 3 falhas: job vai para Dead Letter Queue (`{queue-name}:failed`)
- DLQ é monitorada — alerta via log crítico + (futuro) notificação

---

## 7. Filas — BullMQ

Usar fila para qualquer operação que:
- Pode falhar e precisa de retry
- É demorada (> 500ms)
- Precisa ser processada em background
- Precisa de rate limiting (anti-ban WhatsApp)

### Filas existentes

| Fila | Responsabilidade |
|---|---|
| `broadcast` | Envio de mensagens em massa (com delay configurável) |
| `group-mention` | Envio de menções em grupos |
| `ai-response` | Processamento de resposta da IA |
| `webhook-inbound` | Processar webhooks recebidos da Evolution API |
| `notification` | Notificações internas do sistema |

### Estrutura de um job

```typescript
// Todo job deve incluir tenantId para isolamento
interface BaseJob {
  tenantId: string
  triggeredBy: string   // userId
  createdAt: string
}
```

---

## 8. Banco de Dados — Prisma

### Schema base obrigatório em toda tabela de negócio

```prisma
model Exemplo {
  id        String   @id @default(cuid())
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?              // soft delete

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

### Regras

- Sempre usar **CUID** como ID (não UUID, não autoincrement)
- Sempre soft delete (`deletedAt`) — nunca `DELETE` físico em produção
- Sempre indexar `tenantId` + campos usados em filtros frequentes
- Migrations com nome descritivo: `20260303_add_instance_status`
- Nunca alterar migration já aplicada em produção — criar nova

---

## 9. Frontend — Next.js

```
apps/web/src/
├── app/                           ← App Router
│   ├── (auth)/                    ← rotas públicas (login, register)
│   └── (dashboard)/               ← rotas protegidas por tenant
│       ├── instances/
│       ├── broadcasts/
│       ├── inbox/
│       ├── crm/
│       └── settings/
├── components/
│   ├── ui/                        ← componentes base (shadcn/ui)
│   └── modules/                   ← componentes por módulo
├── hooks/
├── lib/
│   ├── api.ts                     ← cliente HTTP (axios/ky)
│   └── socket.ts                  ← Socket.io client
└── stores/                        ← Zustand (estado global)
```

**Regras:**
- Server Components por padrão — Client Component (`'use client'`) apenas quando necessário
- Nunca fazer fetch direto ao banco no frontend — sempre via API
- Estado global com **Zustand** — sem Redux
- Estilização com **Tailwind CSS** + **shadcn/ui**

### Design System — Paleta de Cores

Baseado no template **Tasko** (verde-floresta profundo). Cores definidas via CSS variables em `globals.css`.

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--primary` | `#005e30` (verde-floresta) | `hsl(153 80% 35%)` | Botões, nav ativo, badges |
| `--accent` | `#008b46` (verde médio) | `hsl(153 60% 25%)` | Links, hover states |
| `--background` | `#f8f9f5` (off-white esverdeado) | `hsl(160 20% 5%)` | Fundo geral |
| `--muted` | `#f1f3eb` (cinza esverdeado) | `hsl(160 15% 14%)` | Fundos secundários |
| `--border` | `#e3e6de` (cinza esverdeado) | `hsl(160 12% 15%)` | Bordas, divisores |
| `--destructive` | `#e40014` | `hsl(0 62.8% 30.6%)` | Erros, ações perigosas |

**Paleta brand (Tailwind):** `primary-50` → `primary-900` escala completa em `tailwind.config.ts`

**Semânticas:** `danger` (#EF4444), `warning` (#F59E0B), `info` (#3B82F6), `success` (#008b46)

**Chart:** 5 tons de verde (`--chart-1` a `--chart-5`) para gráficos

**Sidebar:** Active nav = fundo sólido `bg-primary` + `text-primary-foreground` + `shadow-lg shadow-primary/20` + `rounded-lg`

**Border radius:** `--radius: 1rem` (16px) — cards arredondados

**Dark mode:** Suporte completo via `next-themes` com `attribute="class"`

---

## 10. Infraestrutura Docker

```yaml
# docker-compose.yml (desenvolvimento)
services:
  api:
    build: ./apps/api
    ports: ["3001:3001"]
    depends_on: [postgres, redis]

  web:
    build: ./apps/web
    ports: ["3000:3000"]

  evolution:
    image: atendai/evolution-api:latest
    ports: ["8080:8080"]
    environment:
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: ...

  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
```

### Variáveis de ambiente obrigatórias (`apps/api/.env`)

```env
# Banco
DATABASE_URL=

# Redis
REDIS_URL=

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Evolution API
EVOLUTION_API_URL=
EVOLUTION_API_KEY=

# IA
ANTHROPIC_API_KEY=

# App
NODE_ENV=
PORT=3001
APP_URL=
```

---

## 11. RULE — Protocolo Obrigatório para Implementar Qualquer Funcionalidade

> **ESTA SEÇÃO É UMA REGRA DE EXECUÇÃO.**
> Toda vez que for solicitada a implementação de qualquer funcionalidade — nova ou existente —
> este protocolo deve ser seguido na ordem abaixo, sem exceção.
> Não iniciar nenhum código antes de completar as etapas de análise.

---

### PASSO 1 — Análise prévia (responder antes de codar)

Antes de escrever qualquer linha de código, responder explicitamente:

1. **Feature mapeada?** — Está no `FEATURES.md`? Em qual fase/versão?
2. **Módulo responsável?** — Qual módulo cuida disso? Já existe ou precisa criar?
3. **Banco de dados?** — Quais tabelas criar/alterar? Precisam de `tenantId` + índices?
4. **Fila necessária?** — A operação é async, pode falhar ou precisa de rate limit?
5. **Erros possíveis?** — Quais novos códigos de erro registrar em `error-codes.ts`?
6. **WebSocket?** — O frontend precisa ser notificado em tempo real?
7. **Impacto multi-tenant?** — Há risco de dados vazarem entre tenants?

---

### PASSO 2 — Checklist de conformidade (validar antes de finalizar)

Ao terminar a implementação, confirmar cada item:

- [ ] Módulo expõe apenas o `service` — nunca o `repository` para fora
- [ ] Todos os endpoints cobertos pelo `TenantGuard` (ou marcados `@Public()` intencionalmente)
- [ ] Todo `repository.findMany/findFirst` filtra por `tenantId`
- [ ] Novos códigos de erro registrados em `error-codes.ts`
- [ ] Resposta segue envelope padrão `{ data, meta }` ou `{ error }`
- [ ] DTOs validados com Zod
- [ ] Operações longas/falháveis delegadas para fila BullMQ
- [ ] Teste unitário no `service` cobrindo o fluxo principal
- [ ] Variáveis de ambiente novas documentadas no `.env.example`
- [ ] Migration com nome descritivo (`YYYYMMDD_descricao`)

---

### PASSO 3 — Estrutura de arquivos esperada

Todo módulo novo deve seguir exatamente:

```
modules/nome-do-modulo/
├── nome-do-modulo.module.ts
├── nome-do-modulo.controller.ts
├── nome-do-modulo.service.ts
├── nome-do-modulo.repository.ts
├── dto/
│   ├── create-nome.dto.ts
│   └── update-nome.dto.ts
├── entities/
│   └── nome.entity.ts
├── queues/                  ← apenas se usar fila
│   ├── nome.producer.ts
│   └── nome.processor.ts
└── __tests__/
    └── nome.service.spec.ts
```

---

### PASSO 4 — Schema Prisma base obrigatório

Toda tabela nova de negócio deve começar com:

```prisma
model NomeModelo {
  id        String    @id @default(cuid())
  tenantId  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  tenant    Tenant    @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

---

> Consultar também: seção 13 (O que NÃO fazer) antes de finalizar qualquer implementação.

---

## 12. Decisões Técnicas Fixadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Monorepo | Turborepo + pnpm | Cache de build, workspaces nativos |
| Backend | NestJS | Módulos nativos, DI, pipes, guards |
| ORM | Prisma | Type-safe, migrations, multi-DB |
| Validação | Zod | Runtime + compile-time, melhor que class-validator |
| Filas | BullMQ | Redis nativo, retry, DLQ, UI (Bull Board) |
| Logger | Pino | Mais rápido que Winston, JSON estruturado |
| WhatsApp | Evolution API (Baileys) | Leve (50MB), REST nativa, multi-sessão |
| IA/LLM | Claude API (Anthropic) | claude-sonnet-4-6 como default |
| Frontend | Next.js + Tailwind + shadcn/ui | App Router, Server Components |
| Estado | Zustand | Simples, sem boilerplate |
| Realtime | Socket.io | Bidirectional, rooms por tenant |
| Auth | JWT (access 15min + refresh 7d) | Stateless, refresh rotation |
| IDs | CUID | Mais curto que UUID, URL-safe |

---

## 13. O que NÃO fazer

- **Não** acessar o banco diretamente entre módulos — use o service público
- **Não** fazer operações síncronas longas em controllers — use filas
- **Não** guardar estado em memória que precisa sobreviver restart — use Redis
- **Não** criar migrations alterando campo existente — criar nova coluna + migration de dados
- **Não** expor erros internos/stack trace para o cliente em produção
- **Não** fazer query sem filtro de `tenantId` em tabelas de negócio
- **Não** usar `any` em TypeScript — o projeto é strict
- **Não** extrair módulo para microserviço antes de ter gargalo provado

---

## 14. Inbox — Reply/Quote de Mensagens

### Schema

`Message` possui self-relation para citações:

```prisma
model Message {
  quotedMessageId  String?
  quotedMessage    Message?  @relation("QuotedMessage", fields: [quotedMessageId], references: [id])
  replies          Message[] @relation("QuotedMessage")
}
```

### Fluxo de envio (outbound reply)

1. Frontend envia `POST /inbox/conversations/:id/messages` com `{ body, quotedMessageId? }`
2. Service valida que `quotedMessageId` existe no tenant (error: `INBOX_QUOTED_MESSAGE_NOT_FOUND`)
3. Busca `evolutionId` da mensagem citada
4. Passa `{ quotedMessageEvolutionId }` via `SendTextOptions` ao provider
5. Evolution Adapter envia com `quoted: { key: { id } }` no body
6. Mensagem salva no banco com `quotedMessageId` + `quotedMessage` (select: id, body, fromMe, type)
7. WebSocket emite `conversation:new_message` incluindo `quotedMessageId` e `quotedMessage`

### Fluxo de recebimento (inbound reply)

1. Webhook recebe mensagem com `contextInfo.stanzaId` (extraído por `extractQuotedStanzaId`)
2. Processor resolve `stanzaId` → `quotedMessageId` interno via `findMessageByEvolutionId`
3. Salva mensagem com `quotedMessageId` e emite via WebSocket

### Frontend

- `MessageBubble`: mostra preview da mensagem citada dentro da bubble + botão Reply no hover
- `MessageInput`: barra de preview acima do input ao responder, com X para cancelar
- `inbox.store`: state `replyingTo` + action `setReplyingTo`

---

## 15. Inbox — Atualização de Tabs em Tempo Real

Eventos WebSocket que disparam refresh automático de tabs:

| Evento | Ação |
|---|---|
| `conversation:created` | Refresh lista da tab ativa + contadores de todas as tabs |
| `conversation:assigned` | Refresh lista da tab ativa + contadores de todas as tabs |
| `conversation:closed` | Remove conversa da lista + refresh lista e contadores |

A função `refreshInbox()` (em `use-inbox-socket.ts`) busca em paralelo:
- **Tab ativa**: lista completa de conversas + count
- **Demais tabs**: apenas count (`limit=1`)

---

*Referência: FEATURES.md — roadmap de funcionalidades*
*Atualizado em: 2026-03-04*
