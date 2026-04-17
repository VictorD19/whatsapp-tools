# Spec: Integração com Google Calendar

**Data:** 2026-04-17
**Status:** Aprovado pelo usuário
**Fase roadmap:** v2.5+ (Integrations)

---

## 1. Visão Geral

Integração com Google Calendar que permite ao assistente IA agendar compromissos e consultar disponibilidade diretamente na agenda do usuário (atendente) via WhatsApp. Cada usuário dentro do tenant conecta sua própria conta Google via OAuth2.

### Escopo

- Módulo `integrations` com OAuth2 Google (Port & Adapter)
- Duas AI Tools: `CONSULTAR_DISPONIBILIDADE` e `CRIAR_EVENTO`
- Página "Integrações" no Settings do frontend
- Tabelas `Integration` e `CalendarEvent` no banco

### Fora do escopo

- Outlook/Outros providers (arquitetura preparada, mas não implementados)
- Sincronização bidirecional automática (eventos criados fora do sistema)
- Notificações push de eventos próximos
- Cancelamento de eventos pela IA

---

## 2. Arquitetura

### 2.1 Módulo `integrations`

Segue padrão hexagonal (Ports & Adapters) já usado em `whatsapp` e `ai`:

```
modules/integrations/
├── integrations.module.ts
├── integrations.controller.ts
├── integrations.service.ts
├── integrations.repository.ts
├── dto/
│   └── connect-integration.dto.ts
├── ports/
│   └── calendar-provider.interface.ts
├── adapters/
│   └── google/
│       ├── google-calendar.adapter.ts
│       └── google-auth.service.ts
└── __tests__/
    └── integrations.service.spec.ts
```

### 2.2 Fluxo OAuth2

1. Frontend chama `GET /integrations/google/connect`
2. Backend gera URL OAuth2 com PKCE + state (contém tenantId + userId)
3. Usuário autoriza no Google
4. Google redireciona para `GET /integrations/google/callback?code=xxx&state=xxx`
5. Backend troca code por tokens (access + refresh)
6. Tokens criptografados (AES-256) e armazenados na tabela `Integration`
7. Refresh automático quando access token expira (interceptado no adapter)

### 2.3 Fluxo AI Tool — Agendamento

1. Contato pergunta sobre agendamento via WhatsApp
2. IA detecta intenção → executa `[TOOL:CONSULTAR_DISPONIBILIDADE]`
3. Adapter consulta Google Calendar API → retorna slots livres
4. IA formata horários e apresenta ao contato
5. Contato escolhe horário → IA pode pedir email se necessário
6. Contato confirma → IA executa `[TOOL:CRIAR_EVENTO]`
7. Evento criado, contato adicionado como attendee, link Meet retornado
8. IA confirma agendamento com link da reunião

---

## 3. Banco de Dados

### 3.1 Tabela `Integration`

```prisma
model Integration {
  id              String    @id @default(cuid())
  tenantId        String
  userId          String
  provider        String              // "google_calendar", "outlook"
  providerAccountId String            // email da conta Google
  accessToken     String?   @db.Text  // criptografado AES-256
  refreshToken    String?   @db.Text  // criptografado AES-256
  tokenExpiresAt  DateTime?
  scopes          String[]
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  tenant         Tenant    @relation(fields: [tenantId], references: [id])
  user           User      @relation(fields: [userId], references: [id])
  calendarEvents CalendarEvent[]

  @@index([tenantId])
  @@index([userId])
  @@unique([tenantId, userId, provider, deletedAt])
}
```

### 3.2 Tabela `CalendarEvent`

```prisma
model CalendarEvent {
  id              String   @id @default(cuid())
  tenantId        String
  integrationId   String
  externalEventId String               // ID do Google Calendar
  title           String
  description     String?
  startAt         DateTime
  endAt           DateTime
  timezone        String   @default("America/Sao_Paulo")
  location        String?
  attendees       Json?
  hangoutLink     String?
  status          String   @default("confirmed")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  integration Integration @relation(fields: [integrationId], references: [id])

  @@index([tenantId])
  @@index([integrationId])
  @@index([startAt])
}
```

### 3.3 Enum `AiToolType` — novos valores

```
CRIAR_EVENTO
CONSULTAR_DISPONIBILIDADE
```

### 3.4 Migration

Nome: `20260417_google_calendar_integration`

---

## 4. Interface `ICalendarProvider` (Port)

```typescript
interface CalendarEventInput {
  title: string
  description?: string
  startAt: Date
  endAt: Date
  timezone: string
  location?: string
  attendees?: { email: string; name?: string }[]
}

interface CalendarEventResult {
  eventId: string
  hangoutLink?: string
  htmlLink: string
  status: string
}

interface FreeSlot {
  startAt: Date
  endAt: Date
}

interface ICalendarProvider {
  createEvent(accessToken: string, input: CalendarEventInput): Promise<CalendarEventResult>
  listEvents(accessToken: string, from: Date, to: Date): Promise<CalendarEventResult[]>
  getFreeSlots(accessToken: string, from: Date, to: Date, workingHours: WorkingHoursConfig): Promise<FreeSlot[]>
  cancelEvent(accessToken: string, eventId: string): Promise<void>
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>
}
```

`ICalendarProvider` nunca muda. Trocar de provider = criar novo adapter.

---

## 5. Adapter Google Calendar

### `GoogleCalendarAdapter` implementa `ICalendarProvider`

- Usa Google Calendar API v3 (`calendar.googleapis.com/calendar/v3`)
- Refresh token automático quando access token expira (401 interceptado)
- Timeout de 10s por requisição (padrão do projeto)
- Cria evento com Google Meet link automático se `hangoutLink` solicitado

### `GoogleAuthService`

- Gera URL de autorização OAuth2 com PKCE
- Troca authorization code por tokens
- Criptografa tokens com AES-256-GCM antes de armazenar
- Descriptografa ao usar
- Refresh token flow

### Injeção

```typescript
export const CALENDAR_PROVIDER = 'CALENDAR_PROVIDER'

@Module({
  providers: [
    {
      provide: CALENDAR_PROVIDER,
      useClass: GoogleCalendarAdapter,
    },
    GoogleAuthService,
    IntegrationsService,
    IntegrationsRepository,
  ],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
```

---

## 6. AI Tools

### 6.1 `CONSULTAR_DISPONIBILIDADE`

**Config (JSON no AiTool):**
```json
{
  "integrationId": "id-da-integracao",
  "lookAheadDays": 7,
  "slotDurationMinutes": 60,
  "workingHours": { "start": "08:00", "end": "18:00" },
  "workingDays": [1, 2, 3, 4, 5]
}
```

**Execução no ToolExecutorService:**
1. Busca integração pelo `integrationId` (valida tenantId)
2. Descriptografa access token
3. Chama `provider.getFreeSlots()` com range de datas + config
4. Retorna slots livres como texto estruturado para a IA

**Retorno para a IA:**
```
Horários disponíveis:
- 17/04 (quinta): 09:00, 10:00, 14:00, 15:00
- 18/04 (sexta): 09:00, 11:00, 16:00
```

### 6.2 `CRIAR_EVENTO`

**Config (JSON no AiTool):**
```json
{
  "integrationId": "id-da-integracao",
  "defaultDurationMinutes": 60,
  "defaultLocation": "",
  "timezone": "America/Sao_Paulo",
  "createMeetLink": true
}
```

**Contexto extra extraído pela IA da conversa:**
- `title` — título do evento (obrigatório)
- `startAt` — data/hora confirmada pelo contato
- `duration` — duração em minutos (usa default se não informado)
- `attendeeEmail` — email do contato (IA pergunta se não tiver)
- `description` — notas opcionais

**Execução:**
1. Busca integração + descriptografa token
2. Monta `CalendarEventInput`
3. Chama `provider.createEvent()`
4. Salva espelho em `CalendarEvent`
5. Retorna confirmação com link

**Retorno para a IA:**
```
Evento criado com sucesso!
Título: Reunião com João Silva
Data: 17/04/2026 às 14:00
Link Meet: https://meet.google.com/xxx
```

### 6.3 Prompt para a IA

Adicionado pelo `assistant-prompt.builder.ts` quando a tool está vinculada:

```
## Ferramentas de calendário:
- Para consultar horários disponíveis: inclua [TOOL:CONSULTAR_DISPONIBILIDADE] na sua resposta
- Para criar um evento: inclua [TOOL:CRIAR_EVENTO] com os dados do agendamento
Importante: se o contato não informar email, pergunte antes de criar o evento.
Formato de data esperado: ISO 8601 (ex: 2026-04-17T14:00:00)
```

### 6.4 Parsing de parâmetros

Atualmente o `ToolExecutorService` usa `[TOOL:TIPO]` sem parâmetros inline. Para as tools de calendário, precisamos de parâmetros dinâmicos extraídos da conversa.

**Abordagem:** O `ToolExecutorService` recebe o `context` atual + `lastMessage` da conversa. Um parser simples extrai data/hora/título da última mensagem do contato usando regex + heurísticas. O LLM já foi instruído a formatar datas como ISO 8601 no prompt.

---

## 7. API Endpoints

### Backend

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/integrations/google/connect` | Gera URL OAuth2 e redireciona |
| `GET` | `/integrations/google/callback` | Callback OAuth2, troca code por tokens |
| `GET` | `/integrations` | Lista integrações do tenant |
| `GET` | `/integrations/:id` | Detalhes de uma integração |
| `DELETE` | `/integrations/:id` | Desconecta (soft delete + revoga tokens) |
| `GET` | `/integrations/:id/status` | Status da conexão (token válido?) |

Todos os endpoints protegidos por `TenantGuard`.

### Frontend

| Rota | Página |
|------|--------|
| `/settings/integrations` | Lista integrações + botão conectar |

---

## 8. Frontend

### 8.1 Página Settings > Integrações

**Componentes:**
- `IntegrationsPage` — page layout padrão
- `IntegrationCard` — card com logo provider, email, status, botões
- `ConnectGoogleButton` — botão que inicia fluxo OAuth
- `DisconnectDialog` — Dialog de confirmação (padrão Sheet/Dialog das rules)

**Estados do card:**
- **Conectado**: badge verde "Conectado", email da conta, botão "Desconectar"
- **Expirado**: badge amarelo "Token expirado", botão "Reconectar"
- **Erro**: badge vermelho "Erro", botão "Tentar novamente"

### 8.2 Config da AI Tool

No formulário de criar/editar AI Tool (quando tipo = `CRIAR_EVENTO` ou `CONSULTAR_DISPONIBILIDADE`):
- Dropdown para selecionar integração ativa do tenant
- Campos de config específicos (duração, horário comercial, timezone)

### 8.3 i18n

Novo namespace `integrations` nos 3 arquivos JSON:

```json
{
  "integrations": {
    "title": "Integrações",
    "connect": "Conectar Google Calendar",
    "disconnect": "Desconectar",
    "connected": "Conectado",
    "expired": "Token expirado",
    "error": "Erro na conexão",
    "reconnect": "Reconectar",
    "confirmDisconnect": "Desconectar Google Calendar?",
    "confirmDisconnectDescription": "Os agendamentos existentes não serão afetados, mas a IA não poderá criar novos eventos.",
    "noIntegrations": "Nenhuma integração conectada",
    "noIntegrationsHint": "Conecte seu Google Calendar para permitir agendamentos pela IA.",
    "success": {
      "connected": "Google Calendar conectado com sucesso",
      "disconnected": "Google Calendar desconectado"
    },
    "error": {
      "connecting": "Erro ao conectar com Google Calendar",
      "disconnecting": "Erro ao desconectar"
    }
  }
}
```

---

## 9. Segurança

### 9.1 Tokens

- Access e refresh tokens criptografados com AES-256-GCM
- Chave de criptografia em env var `ENCRYPTION_KEY` (32 bytes)
- Nunca expostos via API (endpoint retorna apenas status + email)

### 9.2 OAuth2

- PKCE obrigatório (code_verifier + code_challenge)
- State parameter contém tenantId + userId (validado no callback)
- Scopes mínimos: `calendar.readonly` + `calendar.events`
- Revogação de tokens ao desconectar (`google/oauth2/revoke`)

### 9.3 Multi-tenant

- Todo `findMany/findFirst` filtra por `tenantId`
- Callback OAuth valida que state pertence ao tenant do usuário logado
- Tool execution valida `integrationId` pertence ao tenant correto

---

## 10. Env Vars

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URL=https://api.dominio.com/integrations/google/callback
ENCRYPTION_KEY=chave-aes-256-32-bytes
```

---

## 11. Códigos de Erro

Adicionar em `error-codes.ts`:

```
INTEGRATION_NOT_FOUND
INTEGRATION_NOT_CONNECTED
INTEGRATION_TOKEN_EXPIRED
INTEGRATION_PROVIDER_ERROR
CALENDAR_EVENT_CREATE_FAILED
CALENDAR_FREE_SLOTS_FAILED
ENCRYPTION_KEY_MISSING
```

---

## 12. Testes

### Unitários obrigatórios

**`integrations.service.spec.ts`:**
- Conectar integração (OAuth callback)
- Listar integrações por tenant
- Desconectar (soft delete + revogar)
- Refresh token automático

**`google-calendar.adapter.spec.ts`:**
- `createEvent` — happy path
- `createEvent` — com attendees
- `getFreeSlots` — com eventos existentes
- `getFreeSlots` — dia vazio
- Refresh token automático no 401
- Timeout/erro de rede

**`tool-executor.service.spec.ts` (casos novos):**
- `CONSULTAR_DISPONIBILIDADE` — happy path
- `CONSULTAR_DISPONIBILIDADE` — integração não encontrada
- `CRIAR_EVENTO` — happy path com attendee
- `CRIAR_EVENTO` — integração desconectada

---

## 13. Dependências

- `googleapis` npm package (ou HTTP direto para Calendar API v3)
- Crypto module nativo do Node (AES-256-GCM)

---

## 14. Arquivos a Modificar

1. `packages/database/prisma/schema.prisma` — models + enum
2. `apps/api/src/modules/ai-tools/dto/create-ai-tool.dto.ts` — novos tipos
3. `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts` — novos cases
4. `apps/api/src/modules/assistants/assistant-prompt.builder.ts` — prompt de calendário
5. `apps/api/src/core/errors/error-codes.ts` — novos erros
6. `apps/api/src/app.module.ts` — import IntegrationsModule
7. `apps/web/messages/pt-BR.json`, `en.json`, `es.json` — namespace integrations
8. `.env.example` — novas variáveis
