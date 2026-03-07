# Fluxo Completo do Sistema — WhatsApp Sales Platform

> Documentação detalhada de todos os módulos, seus fluxos, endpoints, modelos e integrações.

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Autenticação (Auth)](#2-autenticação-auth)
3. [Instâncias WhatsApp (Instances)](#3-instâncias-whatsapp-instances)
4. [Webhook — Entrada de Dados do WhatsApp](#4-webhook--entrada-de-dados-do-whatsapp)
5. [Inbox — Atendimento por Chat](#5-inbox--atendimento-por-chat)
6. [Contatos (Contacts)](#6-contatos-contacts)
7. [CRM — Deals e Pipeline](#7-crm--deals-e-pipeline)
8. [Listas de Contatos (Contact Lists)](#8-listas-de-contatos-contact-lists)
9. [Disparo em Massa (Broadcasts)](#9-disparo-em-massa-broadcasts)
10. [Notificações](#10-notificações)
11. [Tenant e Planos](#11-tenant-e-planos)
12. [Camada WhatsApp (Abstração)](#12-camada-whatsapp-abstração)
13. [Filas (BullMQ/Redis)](#13-filas-bullmqredis)
14. [WebSocket — Eventos em Tempo Real](#14-websocket--eventos-em-tempo-real)
15. [Storage de Mídia](#15-storage-de-mídia)

---

## 1. Visão Geral da Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                    │
│                  HTTP REST  +  WebSocket (Socket.io)          │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                         API (NestJS / Fastify)                │
│                                                               │
│  Auth  Instances  Inbox  Contacts  CRM  Broadcasts  Groups   │
│                                                               │
│  WhatsAppService → IWhatsAppProvider → EvolutionAdapter      │
│                                                               │
│  BullMQ Workers: broadcast | inbox-webhook | instance-webhook│
│                  import | notification | group-extract       │
└────────┬──────────────────┬──────────────────────────────────┘
         │                  │
    ┌────▼────┐        ┌────▼────────┐
    │PostgreSQL│        │    Redis    │
    │(Prisma)  │        │ (BullMQ +  │
    └──────────┘        │  Cache)    │
                        └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Evolution API  │
                    │  (Baileys/WA)   │
                    └─────────────────┘
```

### Princípios gerais
- **Multi-tenant**: todos os dados são isolados por `tenantId`
- **Soft delete**: registros nunca são deletados fisicamente (campo `deletedAt`)
- **Envelope padrão**: respostas sempre em `{ data, meta? }` ou `{ error }`
- **Autenticação**: JWT com `accessToken` (15min) + `refreshToken` (7d)
- **WhatsApp**: toda comunicação passa por `WhatsAppService` → `IWhatsAppProvider` → `EvolutionAdapter`

---

## 2. Autenticação (Auth)

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Login com email/senha |
| `POST` | `/api/v1/auth/register` | Cadastro de nova conta + tenant |
| `POST` | `/api/v1/auth/refresh` | Renova accessToken com refreshToken |
| `GET` | `/api/v1/auth/me` | Dados do usuário autenticado |

### Fluxo de Registro

```
POST /auth/register
  { tenantName, name, email, password }
        │
        ├─ [1] Verifica se email já existe
        ├─ [2] Busca plano padrão (isDefault = true)
        ├─ [3] Cria Tenant { name, slug, planId }
        ├─ [4] Cria User { role: 'admin', senha hasheada bcrypt }
        ├─ [5] Cria Pipeline padrão para o tenant
        ├─ [6] Cria Tags padrão (ex: Lead, Cliente, VIP)
        └─ [7] Gera accessToken + refreshToken → retorna
```

### Fluxo de Login

```
POST /auth/login
  { email, password }
        │
        ├─ [1] Busca usuário por email
        ├─ [2] Compara senha com bcrypt
        └─ [3] Gera JWT payload:
               { sub: userId, tenantId, email, role, isSuperAdmin }
               → accessToken (15min) + refreshToken (7d)
```

### Resposta do Login

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "cuid",
    "name": "João",
    "email": "joao@empresa.com",
    "role": "admin",
    "isSuperAdmin": false,
    "tenant": {
      "id": "cuid",
      "name": "Empresa X",
      "slug": "empresa-x",
      "plan": "starter",
      "locale": "pt-BR",
      "timezone": "America/Sao_Paulo",
      "currency": "BRL"
    }
  }
}
```

### Roles disponíveis
| Role | Permissões |
|---|---|
| `admin` | Acesso total ao tenant |
| `agent` | Acesso ao inbox e CRM — não pode gerenciar instâncias, usuários ou planos |

---

## 3. Instâncias WhatsApp (Instances)

Uma **instância** representa um número WhatsApp conectado via Evolution API (Baileys). Cada tenant pode ter múltiplas instâncias (limitado pelo plano).

### Modelo de banco

```
Instance {
  id          — ID interno
  tenantId    — dono da instância
  name        — nome amigável (ex: "Vendas", "Suporte")
  phone       — número conectado (preenchido após conexão)
  status      — DISCONNECTED | CONNECTING | CONNECTED | BANNED
  evolutionId — ID único no Evolution API: "<tenantId>_<name>"
  deletedAt   — soft delete
}
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/instances` | Cria nova instância |
| `GET` | `/api/v1/instances` | Lista instâncias do tenant (com sync de status) |
| `GET` | `/api/v1/instances/:id` | Detalhe de uma instância |
| `POST` | `/api/v1/instances/:id/connect` | Inicia conexão → retorna QR Code |
| `POST` | `/api/v1/instances/:id/disconnect` | Desconecta instância |
| `DELETE` | `/api/v1/instances/:id` | Remove instância (soft delete) |

### Fluxo de Criação

```
POST /instances
  { name: "Vendas" }
        │
        ├─ [1] Verifica nome duplicado no tenant
        ├─ [2] Verifica limite do plano (plan.maxInstances)
        ├─ [3] Chama Evolution API: POST /instance/create
        │       evolutionId = "<tenantId>_<name>"
        │       Registra webhook: /api/v1/webhooks/evolution/<evolutionId>
        └─ [4] Salva no banco com status = DISCONNECTED
```

### Fluxo de Conexão (QR Code)

```
POST /instances/:id/connect
        │
        ├─ [1] Verifica se instância não está já CONNECTED
        ├─ [2] Chama Evolution API: GET /instance/connect/<evolutionId>
        │       → retorna { qrCode (base64), pairingCode? }
        ├─ [3] Atualiza status no banco → CONNECTING
        ├─ [4] Emite WebSocket: instance:qr-updated { instanceId, qrCode }
        └─ [5] Retorna QR Code para o frontend exibir
```

### Ciclo de Vida de Status

```
DISCONNECTED ──connect()──► CONNECTING ──scan QR──► CONNECTED
      ▲                                                  │
      └─────────────disconnect() / ban ─────────────────┘
                                │
                           statusCode 401
                                │
                              BANNED
```

### Sincronização de Status (listagem)

Ao listar instâncias, o sistema chama `getInstanceStatus()` no Evolution API para cada instância e corrige divergências no banco. Isso garante que o frontend sempre veja o status real mesmo que um webhook tenha sido perdido.

### Webhook de Status (recepção assíncrona)

Quando o Evolution API detecta mudança de conexão, envia webhook para:
```
POST /api/v1/webhooks/evolution/<evolutionId>
```

O webhook é processado de forma assíncrona pela fila `WEBHOOK_INSTANCE`:

```
Webhook recebido
        │
        ├─ event: "connection.update"
        │       └─ state: "open"    → status CONNECTED, busca telefone
        │          state: "close"   → status DISCONNECTED (ou BANNED se code 401)
        │          state: "connecting" → status CONNECTING
        │
        ├─ event: "qrcode.updated"
        │       └─ Emite novo QR via WebSocket
        │
        └─ Dispara notificações para admins do tenant
              CONNECTED  → "Instância conectada"
              DISCONNECTED → "Instância desconectada"
              BANNED → "Instância banida"
```

---

## 4. Webhook — Entrada de Dados do WhatsApp

Todos os eventos do Evolution API chegam em:
```
POST /api/v1/webhooks/evolution/:instanceName
```

O controller distribui os eventos para duas filas diferentes:

```
Webhook recebido
        │
        ├─ Eventos de conexão (connection.update, qrcode.updated)
        │       └─► Fila: WEBHOOK_INSTANCE → InstanceWebhookProcessor
        │
        └─ Eventos de mensagem (messages.upsert, messages.update)
                └─► Fila: WEBHOOK_INBOUND → InboxWebhookProcessor
```

### Por que filas?
- **Desacoplamento**: o webhook retorna `200 OK` imediatamente para o Evolution API
- **Resilência**: se a API cair, os jobs ficam no Redis e são reprocessados
- **Ordenação**: mensagens são processadas na ordem em que chegaram

---

## 5. Inbox — Atendimento por Chat

O Inbox é o módulo de atendimento humano multi-agente. Cada conversa segue um ciclo de vida com filas de espera, atribuição e encerramento.

### Modelos de banco

```
Conversation {
  id           — ID interno
  tenantId     — isolamento multi-tenant
  instanceId   — qual número WhatsApp recebeu
  contactId    — quem enviou
  assignedToId — agente responsável (null = pendente)
  protocol     — número único gerado (ex: "SCHA-1001")
  status       — PENDING | OPEN | CLOSE
  tags         — array de strings (ex: ["urgente", "vip"])
  summary      — resumo gerado por IA (futuro)
  unreadCount  — mensagens não lidas
  lastMessageAt
}

Message {
  id              — ID interno
  conversationId
  fromMe          — true = enviado pelo agente/sistema
  fromBot         — true = enviado por assistente IA
  body            — texto da mensagem
  type            — TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT | STICKER | LOCATION | CONTACT | UNKNOWN
  status          — PENDING | SENT | DELIVERED | READ | FAILED
  evolutionId     — ID da mensagem no Evolution API/WhatsApp
  mediaUrl        — storage key ou 'has-media'
  quotedMessageId — referência de resposta
  sentAt
}
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/inbox/conversations` | Lista conversas com filtros e abas |
| `GET` | `/api/v1/inbox/conversations/:id` | Detalhe de uma conversa |
| `GET` | `/api/v1/inbox/conversations/:id/messages` | Mensagens paginadas |
| `POST` | `/api/v1/inbox/conversations/:id/assign` | Agente assume a conversa |
| `POST` | `/api/v1/inbox/conversations/:id/messages` | Envia mensagem de texto |
| `POST` | `/api/v1/inbox/conversations/:id/media` | Envia mensagem de mídia |
| `POST` | `/api/v1/inbox/conversations/:id/close` | Encerra conversa |
| `POST` | `/api/v1/inbox/conversations/:id/transfer` | Transfere para outro agente |
| `POST` | `/api/v1/inbox/conversations/:id/reopen` | Reabre conversa encerrada |
| `GET` | `/api/v1/inbox/conversations/:id/media/:messageId` | Download de mídia |
| `POST` | `/api/v1/inbox/conversations/:id/sync` | Sincroniza histórico com Evolution API |
| `POST` | `/api/v1/inbox/instances/:instanceId/import` | Importa conversas do WhatsApp |

### Filtros de Listagem (Abas)

| Aba | Comportamento |
|---|---|
| `all` | Todas não-encerradas |
| `mine` | Atribuídas ao usuário atual, não-encerradas |
| `unassigned` | Sem agente, status PENDING |

### Fluxo de Mensagem Recebida (via webhook)

```
Evolution API → POST /webhooks/evolution/<instanceName>
        │
        └─► Fila WEBHOOK_INBOUND
                │
                ├─ [1] Filtra mensagens antigas (> 60s) → ignora
                ├─ [2] Extrai remoteJid (número do contato)
                │       Trata formato @lid (LID do WhatsApp Business)
                │
                ├─ [3] findOrCreate Contact { phone, name, tenantId }
                │
                ├─ [4] findOrCreate Conversation
                │       └─ Gera protocol: "<TENANT_PREFIX>-<seq>"
                │
                ├─ [5] Deduplica por evolutionId
                │       └─ Mensagem já existe no banco? → ignora
                │
                ├─ [6] parseWhatsAppMessage(msg)
                │       → extrai body, type, mediaUrl, quotedId
                │
                ├─ [7] Se tem mídia (image/video/audio/document):
                │       └─ Download via Evolution API → upload para Storage local
                │
                ├─ [8] Cria Message no banco
                │
                ├─ [9] Atualiza lastMessageAt + unreadCount na conversation
                │
                └─ [10] Emite WebSocket: inbox:new-message { conversationId, message }
```

### Fluxo de Assumir Conversa

```
POST /conversations/:id/assign
        │
        ├─ [1] Verifica status === 'PENDING'
        ├─ [2] Verifica que ninguém assumiu ainda
        ├─ [3] Atualiza: assignedToId = userId, status = OPEN
        ├─ [4] Emite: conversation:assigned { conversationId, assignedToId }
        ├─ [5] Auto-cria Deal no CRM (se não for grupo)
        └─ [6] Envia notificação ao agente: "Você assumiu a conversa com [Nome]"
```

### Fluxo de Envio de Mensagem

```
POST /conversations/:id/messages
  { body, quotedMessageId?, mentions? }
        │
        ├─ [1] Verifica status === 'OPEN'
        ├─ [2] Verifica que userId é o agente atribuído (admin pode enviar em qualquer conversa)
        ├─ [3] Se há mentions e é grupo:
        │       └─ sendGroupMention() com lista de JIDs
        │          Remove marcadores "@todos" e "@[Nome]" do texto enviado
        ├─ [4] Caso contrário: sendText() (com suporte a quotedMessageEvolutionId)
        ├─ [5] Persiste Message no banco
        ├─ [6] Atualiza lastMessageAt
        └─ [7] Emite WebSocket: inbox:new-message
```

### Ciclo de Vida de uma Conversa

```
Mensagem recebida
        │
        ▼
   [PENDING] ──assign()──► [OPEN] ──close()──► [CLOSE]
                               ▲                   │
                               └───reopen()────────┘
```

---

## 6. Contatos (Contacts)

Contatos são criados automaticamente ao receber uma mensagem, ou manualmente pelo CRM.

### Modelo de banco

```
Contact {
  id        — ID único
  tenantId  — isolamento multi-tenant
  phone     — número no formato WhatsApp (ex: "5511999999999")
  name      — nome (pode ser null para contatos sem nome no WhatsApp)
  avatarUrl — foto do perfil (sincronizada via webhook)
  deletedAt — soft delete
  UNIQUE(tenantId, phone)
}
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/contacts` | Lista com filtros e paginação |
| `GET` | `/api/v1/contacts/:id` | Detalhe + conversas + deals + tags |
| `POST` | `/api/v1/contacts` | Cria contato manualmente |
| `PUT` | `/api/v1/contacts/:id` | Atualiza nome/telefone |
| `DELETE` | `/api/v1/contacts/:id` | Soft delete |

### findOrCreate

O método `findOrCreate` é chamado automaticamente em dois momentos:
1. **Webhook de mensagem recebida** — cria o contato se não existir
2. **Importação de conversas** — idem

Regra: `UNIQUE(tenantId, phone)` — nunca haverá duplicatas do mesmo número no mesmo tenant.

### Tags de Contato

Contatos podem ter múltiplas tags associadas via tabela `ContactTag` (relação N:N com `Tag`).

---

## 7. CRM — Deals e Pipeline

O CRM permite rastrear oportunidades de negócio em um funil Kanban com estágios customizáveis.

### Modelos de banco

```
Pipeline {
  id        — ID único
  tenantId
  name      — nome do pipeline (ex: "Vendas")
  isDefault — pipeline padrão do tenant (criado no registro)
}

PipelineStage {
  pipelineId
  name      — nome do estágio (ex: "Novo Lead", "Proposta", "Fechado")
  color     — cor hex para o Kanban
  type      — ACTIVE | WON | LOST
  order     — posição no funil
  isDefault — estágio padrão para novos deals
}

Deal {
  tenantId
  pipelineId
  stageId       — posição atual no funil
  contactId     — contato vinculado
  conversationId — conversa que gerou o deal (opcional)
  assignedToId  — agente responsável
  title         — título do negócio
  value         — valor monetário
  wonAt / lostAt / lostReason
}

DealNote {
  dealId
  authorId  — usuário que escreveu
  content   — texto da nota
}
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/deals` | Lista deals com filtros |
| `GET` | `/api/v1/deals/:id` | Detalhe de um deal |
| `POST` | `/api/v1/deals` | Cria deal manualmente |
| `PUT` | `/api/v1/deals/:id` | Atualiza título/valor/responsável |
| `POST` | `/api/v1/deals/:id/move` | Move para outro estágio |
| `DELETE` | `/api/v1/deals/:id` | Soft delete |
| `GET` | `/api/v1/deals/:id/notes` | Lista notas do deal |
| `POST` | `/api/v1/deals/:id/notes` | Adiciona nota |
| `GET` | `/api/v1/pipelines` | Lista pipelines do tenant |
| `POST` | `/api/v1/pipelines` | Cria pipeline |
| `PUT` | `/api/v1/pipelines/:id` | Atualiza pipeline |
| `DELETE` | `/api/v1/pipelines/:id` | Remove pipeline |

### Auto-criação de Deal

Quando um agente **assume uma conversa** (não grupal), o sistema tenta criar automaticamente um deal:

```
assignConversation()
        │
        └─ DealService.findOrCreateForContact(tenantId, contactId, conversationId)
                │
                ├─ Se já existe deal ativo para o contato → apenas vincula conversationId
                └─ Se não existe → cria deal no pipeline padrão, estágio padrão
```

### Fluxo de Movimentação no Kanban

```
POST /deals/:id/move
  { stageId, lostReason? }
        │
        ├─ Verifica deal não está fechado (WON/LOST)
        ├─ Verifica novo estágio pertence ao mesmo pipeline
        ├─ Se newStage.type === 'WON' → preenche wonAt
        ├─ Se newStage.type === 'LOST' → preenche lostAt + lostReason
        └─ Notifica responsável do deal (DEAL_WON / DEAL_LOST)
```

---

## 8. Listas de Contatos (Contact Lists)

Listas agrupam contatos para uso em disparos em massa.

### Modelo de banco

```
ContactList {
  tenantId
  name
  description
  source       — GROUP_EXTRACT | CSV_IMPORT | MANUAL | CRM_FILTER
  contactCount — contador denormalizado
}

ContactListItem {
  contactListId
  contactId
  @@id([contactListId, contactId])  — sem duplicatas
}
```

### Origens de lista

| Source | Como é criada |
|---|---|
| `GROUP_EXTRACT` | Extração de membros de grupo WhatsApp (via fila `GROUP_CONTACT_EXTRACT`) |
| `CSV_IMPORT` | Importação de arquivo CSV (v1.5) |
| `MANUAL` | Criada manualmente pelo usuário |
| `CRM_FILTER` | Gerada a partir de filtros do CRM (futuro) |

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/contact-lists` | Lista todas as listas do tenant |
| `POST` | `/api/v1/contact-lists` | Cria lista manual |
| `PUT` | `/api/v1/contact-lists/:id` | Atualiza nome/descrição |
| `DELETE` | `/api/v1/contact-lists/:id` | Soft delete |
| `GET` | `/api/v1/contact-lists/:id/contacts` | Contatos da lista |
| `POST` | `/api/v1/contact-lists/:id/contacts` | Adiciona contatos à lista |
| `DELETE` | `/api/v1/contact-lists/:id/contacts` | Remove contatos da lista |

---

## 9. Disparo em Massa (Broadcasts)

Documentado em detalhe separado: `docs/BROADCAST_FLOW.md`

**Resumo**: cria campanha com variações de mensagem, enfileira job no Redis, processa destinatários em batches com round-robin entre instâncias, emite progresso via WebSocket.

---

## 10. Notificações

Sistema de notificações in-app com preferências por tipo.

### Tipos de notificação

| Tipo | Quando dispara |
|---|---|
| `NEW_MESSAGE` | Nova mensagem recebida (reservado) |
| `CONVERSATION_ASSIGNED` | Agente assume conversa |
| `CONVERSATION_TRANSFERRED` | Conversa transferida para agente |
| `CONVERSATIONS_IMPORTED` | Importação de conversas concluída |
| `INSTANCE_CONNECTED` | Instância conectada |
| `INSTANCE_DISCONNECTED` | Instância desconectada |
| `INSTANCE_BANNED` | Instância banida pelo WhatsApp |
| `DEAL_WON` | Deal marcado como ganho |
| `DEAL_LOST` | Deal marcado como perdido |
| `DEAL_ASSIGNED` | Deal atribuído ao agente |
| `GROUP_EXTRACTION_COMPLETED` | Extração de membros de grupo concluída |
| `BROADCAST_COMPLETED` | Campanha de disparo concluída |
| `BROADCAST_FAILED` | Campanha falhou |

### Fluxo

```
Qualquer serviço chama: NotificationsService.dispatch(data)
        │
        └─► Fila NOTIFICATION (assíncrono)
                │
                ├─ [1] Verifica preferência do usuário (inApp: true/false)
                ├─ [2] Se inApp = true: cria registro Notification no banco
                ├─ [3] Emite WebSocket: notification:new para sala user:<userId>
                └─ [4] Emite WebSocket: notification:unread-count atualizado
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/notifications` | Lista notificações do usuário + unreadCount |
| `POST` | `/api/v1/notifications/:id/read` | Marca como lida |
| `POST` | `/api/v1/notifications/read-all` | Marca todas como lidas |
| `GET` | `/api/v1/notifications/unread-count` | Contagem de não lidas |
| `GET` | `/api/v1/notifications/preferences` | Preferências por tipo |
| `PUT` | `/api/v1/notifications/preferences/:type` | Atualiza preferência |

---

## 11. Tenant e Planos

### Tenant

Representa uma empresa/conta na plataforma. Cada tenant é completamente isolado dos demais.

```
Tenant {
  name           — nome da empresa
  slug           — identificador único em URL (ex: "empresa-x")
  planId         — plano contratado
  protocolPrefix — prefixo do protocolo de atendimento (padrão: "SCHA")
  protocolSeq    — contador sequencial para protocolos
  locale         — idioma (padrão: "pt-BR")
  timezone       — fuso horário (padrão: "America/Sao_Paulo")
  currency       — moeda (padrão: "BRL")
}
```

### Plano

Define os limites da conta:

```
Plan {
  name / slug
  maxInstances            — max de instâncias WhatsApp
  maxUsers                — max de usuários
  maxAssistants           — max de assistentes IA
  maxBroadcastsPerDay     — campanhas de disparo por dia
  maxContactsPerBroadcast — contatos por campanha
  price
  isDefault               — plano atribuído no registro
}
```

### Endpoints de Tenant

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/tenants/me` | Dados do tenant atual |
| `PUT` | `/api/v1/tenants/me` | Atualiza configurações (locale, timezone, currency, etc.) |

---

## 12. Camada WhatsApp (Abstração)

Toda comunicação com o WhatsApp segue o padrão **Ports & Adapters** (Hexagonal Architecture):

```
Qualquer módulo
        │
        ▼
WhatsAppService           ← injeta IWhatsAppProvider
        │
        ▼
IWhatsAppProvider         ← interface/contrato (nunca muda)
        │
        ▼
EvolutionAdapter          ← implementação atual (Evolution API / Baileys)
        │
        ▼
EvolutionHttpClient       ← HTTP client isolado (axios)
        │
        ▼
Evolution API             ← servidor externo
        │
        ▼
WhatsApp / Baileys
```

### Interface do Provider

```typescript
IWhatsAppProvider {
  // Instâncias
  createInstance(config)       → InstanceResult
  connectInstance(id)          → QRCodeResult
  disconnectInstance(id)       → void
  deleteInstance(id)           → void
  getInstanceStatus(id)        → InstanceStatus
  getInstanceInfo(id)          → InstanceInfo { phone }

  // Mensagens
  sendText(id, to, text, opts?) → MessageResult
  sendImage(id, to, payload)    → MessageResult
  sendVideo(id, to, payload)    → MessageResult
  sendAudio(id, to, payload)    → MessageResult
  sendDocument(id, to, payload) → MessageResult

  // Grupos
  getGroups(id)                 → Group[]
  getGroupMembers(id, groupId)  → GroupMember[]
  sendGroupMention(id, groupId, payload) → MessageResult

  // Histórico
  findMessages(id, opts)        → HistoryMessage[]
  getMediaBase64(id, messageId) → { base64, mimetype }

  // Webhook
  setWebhook(id, url, events)   → void
}
```

### Como trocar de provider

1. Criar `adapters/meta-cloud/meta-cloud.adapter.ts` implementando `IWhatsAppProvider`
2. Em `whatsapp.module.ts`, trocar `useClass: EvolutionAdapter` → `useClass: MetaCloudAdapter`
3. **Nenhum outro arquivo precisa mudar**

---

## 13. Filas (BullMQ/Redis)

Todas as operações assíncronas ou que podem falhar são processadas via filas.

### Filas registradas

| Fila | Worker | Função |
|---|---|---|
| `broadcast` | `BroadcastProcessor` | Processa disparos em massa |
| `webhook-inbound` | `InboxWebhookProcessor` | Processa mensagens recebidas |
| `webhook-instance` | `InstanceWebhookProcessor` | Processa mudanças de status de instância |
| `conversation-import` | `ConversationImportProcessor` | Importa histórico de conversas |
| `notification` | `NotificationProcessor` | Cria e emite notificações |
| `group-contact-extract` | `GroupContactExtractProcessor` | Extrai membros de grupos |

### Configuração global (queue.module.ts)

```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,   // ← jobs falhos ficam visíveis para debug
}
```

> **Redis**: a URL é lida de `REDIS_URL` (formato `redis://host:port`) ou `REDIS_HOST` + `REDIS_PORT`.

### Padrão de registro de worker

Dois padrões coexistem no projeto:

**Padrão 1 — Decorator NestJS** (preferido):
```typescript
@Processor(QUEUES.WEBHOOK_INSTANCE)
export class InstanceWebhookProcessor {
  @Process('instance-webhook')
  async handle(job: Job) { ... }
}
```

**Padrão 2 — Manual com OnModuleInit** (usado no Broadcast):
```typescript
export class BroadcastProcessor implements OnModuleInit {
  async onModuleInit() {
    await this.queue.isReady()
    this.queue.process('send-broadcast', 2, (job) => this.handle(job))
  }
}
```

---

## 14. WebSocket — Eventos em Tempo Real

O frontend se conecta ao Socket.io e entra em salas baseadas em tenant e usuário:

```
tenant:<tenantId>     — eventos do tenant (instâncias, broadcasts, inbox)
user:<userId>         — eventos pessoais (notificações)
```

### Todos os eventos emitidos

#### Instâncias

| Evento | Payload | Quando |
|---|---|---|
| `instance:status-changed` | `{ instanceId, status }` | Qualquer mudança de status |
| `instance:qr-updated` | `{ instanceId, qrCode }` | Novo QR Code disponível |
| `instance:connected` | `{ instanceId, phone }` | Instância conectada |
| `instance:disconnected` | `{ instanceId }` | Instância desconectada |

#### Inbox

| Evento | Payload | Quando |
|---|---|---|
| `inbox:new-message` | `{ conversationId, message }` | Mensagem recebida ou enviada |
| `inbox:conversation-created` | `{ conversation }` | Nova conversa criada |
| `inbox:conversation-assigned` | `{ conversationId, assignedToId, status }` | Conversa assumida |
| `inbox:conversation-closed` | `{ conversationId, closedBy }` | Conversa encerrada |
| `inbox:conversation-transferred` | `{ conversationId, previous, new }` | Conversa transferida |

#### Broadcasts

| Evento | Payload | Quando |
|---|---|---|
| `broadcast:started` | `{ broadcastId, name, total }` | Início do disparo |
| `broadcast:progress` | `{ broadcastId, sent, failed, total }` | A cada 5 msgs enviadas |
| `broadcast:completed` | `{ broadcastId, sent, failed, total }` | Disparo concluído |
| `broadcast:failed` | `{ broadcastId, reason }` | Erro fatal |
| `broadcast:paused` | `{ broadcastId }` | Pausado |

#### Notificações

| Evento | Payload | Quando |
|---|---|---|
| `notification:new` | `{ notification, unreadCount }` | Nova notificação |
| `notification:unread-count` | `number` | Contagem atualizada |

---

## 15. Storage de Mídia

Toda mídia (imagens, vídeos, áudios, documentos) enviada ou recebida é armazenada localmente em **MinIO** (compatível com S3).

### Storage Key

Arquivos no storage são identificados por uma **storage key** no formato:
```
media/<tenantId>/<uuid>.<ext>
```

A função `isStorageKey(url)` detecta se uma string é uma storage key (começa com `media/`).

### Fluxo — Mídia Recebida (webhook)

```
Mensagem com mídia recebida
        │
        ├─ [1] InboxWebhookProcessor detecta tipo de mídia
        ├─ [2] Baixa arquivo via Evolution API (base64)
        ├─ [3] Converte para Buffer
        └─ [4] StorageService.uploadMedia() → salva no MinIO
                └─ Retorna storage key → salva em Message.mediaUrl
```

### Fluxo — Download de Mídia pelo Frontend

```
GET /inbox/conversations/:id/media/:messageId
        │
        ├─ Verifica Message.mediaUrl
        │
        ├─ É storage key (media/...)
        │       └─ StorageService.download() → proxy do buffer ao cliente
        │
        └─ É mediaUrl externo / só 'has-media'
                └─ Fallback: Evolution API → getMediaBase64() → proxy do buffer
```

### Tipos armazenados

Apenas mídias com valor (não stickers) são armazenadas:
- `IMAGE`, `VIDEO`, `AUDIO`, `DOCUMENT`

Stickers e mídias efêmeras não são armazenados (apenas referenciados).

### Variáveis de Ambiente

```env
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=whatsapp-media
```

---

## Resumo de Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://user:pass@postgres:5432/whatsapp

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=secret-aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=refresh-secret-aqui
JWT_REFRESH_EXPIRES_IN=7d

# Evolution API
EVOLUTION_API_URL=http://evolution:8080
EVOLUTION_API_KEY=sua-api-key

# Webhook (URL que o Evolution vai chamar)
WEBHOOK_URL=http://api:3001
APP_URL=http://localhost:8000

# Storage (MinIO)
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=whatsapp-media
```

---

## Diagrama de Relacionamento entre Módulos

```
         Register/Login
              │
              ▼
          [Auth] ──────────────── [Plan] ← define limites
              │
              ▼
          [Tenant]
              │
      ┌───────┼────────────────────┐
      │       │                    │
      ▼       ▼                    ▼
  [Instance] [User]          [Pipeline/Stages]
      │                            │
      │ webhook                    │ auto-cria
      ▼                            ▼
  [Inbox] ──── findOrCreate ──► [Contact] ──► [ContactList]
      │                            │                │
      │ assign()                   │ tags           │ usado em
      ▼                            ▼                ▼
  [Deal] ←──────────────────── [Tag]        [Broadcasts]
      │
      ▼
  [DealNote]

  Todos os módulos → [Notifications] → [WebSocket]
  Todos os módulos → [Storage] (mídia)
  Todos os módulos → [WhatsAppService] → [EvolutionAdapter]
```
