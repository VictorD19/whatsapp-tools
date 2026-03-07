# Fluxo Completo — Módulo de Disparo em Massa (Broadcasts)

## Visão Geral

O módulo de Disparo em Massa permite enviar mensagens WhatsApp para uma lista de contatos de forma automática, com suporte a variações de mensagem, agendamento, mídia (imagem, vídeo, áudio, documento) e controle em tempo real (pausar, retomar, cancelar).

---

## Arquitetura do Módulo

```
modules/broadcasts/
├── broadcasts.controller.ts     — endpoints HTTP (multipart form)
├── broadcasts.service.ts        — regras de negócio
├── broadcasts.repository.ts     — acesso ao banco (Prisma)
├── broadcasts.gateway.ts        — eventos WebSocket em tempo real
├── dto/
│   ├── create-broadcast.dto.ts  — schema Zod + VariationInput
│   └── list-broadcasts.dto.ts   — filtros de listagem
└── queues/
    ├── broadcast.producer.ts    — enfileira jobs no BullMQ/Redis
    └── broadcast.processor.ts   — worker que executa o disparo
```

---

## Modelos de Banco de Dados

### `Broadcast` — campanha principal
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | cuid | Identificador único |
| `tenantId` | String | Isolamento multi-tenant |
| `name` | String | Nome da campanha |
| `status` | enum | `DRAFT` → `SCHEDULED` → `RUNNING` → `COMPLETED` / `PAUSED` / `FAILED` / `CANCELLED` |
| `messageType` | enum | Tipo legado da 1ª variação (TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT) |
| `messageTexts` | String[] | Textos legados (compatibilidade anterior) |
| `delay` | Int | Intervalo em segundos entre cada mensagem |
| `totalCount` | Int | Total de destinatários |
| `sentCount` | Int | Enviados com sucesso |
| `failedCount` | Int | Falhas |
| `scheduledAt` | DateTime? | Data/hora do agendamento |
| `startedAt` | DateTime? | Quando o disparo começou de fato |
| `completedAt` | DateTime? | Quando finalizou |

### `BroadcastVariation` — variações de mensagem (N por campanha)
| Campo | Tipo | Descrição |
|---|---|---|
| `messageType` | enum | Tipo da mensagem desta variação |
| `text` | String | Texto da mensagem (suporta `{{nome}}` e `{{telefone}}`) |
| `mediaUrl` | String? | Storage key ou URL pública da mídia |
| `fileName` | String? | Nome do arquivo (para DOCUMENT) |
| `sortOrder` | Int | Ordem de criação |

### `BroadcastRecipient` — destinatários (N por campanha)
| Campo | Tipo | Descrição |
|---|---|---|
| `phone` | String | Número de telefone |
| `name` | String? | Nome (para interpolação `{{nome}}`) |
| `status` | enum | `PENDING` → `SENT` / `FAILED` |
| `sentAt` | DateTime? | Quando foi enviado |
| `failedReason` | String? | Motivo da falha (max 500 chars) |

### Tabelas de relação
- `BroadcastInstance` — instâncias WhatsApp vinculadas (N:N)
- `BroadcastSource` — origem dos contatos (`CONTACT_LIST` ou `GROUP`)

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/broadcasts` | Cria e enfileira campanha |
| `PUT` | `/api/v1/broadcasts/:id` | Edita campanha (apenas DRAFT/SCHEDULED) |
| `GET` | `/api/v1/broadcasts` | Lista campanhas com filtros e paginação |
| `GET` | `/api/v1/broadcasts/:id` | Detalhe de uma campanha + stats de destinatários |
| `POST` | `/api/v1/broadcasts/:id/pause` | Pausa campanha em execução |
| `POST` | `/api/v1/broadcasts/:id/resume` | Retoma campanha pausada |
| `POST` | `/api/v1/broadcasts/:id/cancel` | Cancela campanha |
| `DELETE` | `/api/v1/broadcasts/:id` | Soft delete (não pode estar RUNNING) |

> Todos os endpoints requerem autenticação JWT + `TenantGuard` (isolamento por tenant).

---

## Formato do Request — `POST /broadcasts`

A criação usa **multipart form-data** (para suportar upload de mídia por variação):

```
Content-Type: multipart/form-data

Campos de texto:
  name           — nome da campanha
  instanceIds[]  — IDs das instâncias WhatsApp (um ou mais)
  contactListIds[] — IDs das listas de contatos
  groups         — JSON: [{ jid, name }] (grupos do WhatsApp)
  delay          — intervalo entre mensagens (segundos, padrão: 5)
  scheduledAt    — ISO datetime com timezone (opcional)
  variations     — JSON: [{ messageType, text }, ...]

Arquivos (opcionais, por índice):
  file-0         — arquivo da variação 0
  file-1         — arquivo da variação 1
  ...
```

**Exemplo de `variations`:**
```json
[
  { "messageType": "TEXT", "text": "Olá {{nome}}, temos uma oferta!" },
  { "messageType": "IMAGE", "text": "Confira nossa promoção {{nome}}!" }
]
```

---

## Fluxo Completo — Criação e Execução

### Passo 1 — Controller recebe o multipart

```
POST /broadcasts
    │
    ▼
BroadcastsController.create()
    │
    ├─ Lê campos de texto + arquivos do multipart stream
    ├─ Monta CreateBroadcastDto (validado via Zod)
    └─ Monta VariationInput[] (variações + arquivos por índice)
```

### Passo 2 — Service valida e processa

```
BroadcastsService.create()
    │
    ├─ [1] Upload de mídia por variação
    │       └─ Se v.file existe → StorageService.uploadMedia()
    │          → retorna storage key (ex: "media/tenantId/uuid.jpg")
    │
    ├─ [2] Valida limite do plano
    │       └─ countTodayBroadcasts() ≥ plan.maxBroadcastsPerDay → lança BROADCAST_DAILY_LIMIT
    │
    ├─ [3] Valida instâncias
    │       ├─ findInstancesByIds() → instâncias do tenant
    │       └─ filter(status === 'CONNECTED') → ao menos 1 conectada
    │
    ├─ [4] Resolve destinatários das listas de contatos
    │       └─ resolveContactListRecipients() → contatos das listas selecionadas
    │
    ├─ [5] Deduplica por telefone (Map<phone, recipient>)
    │
    ├─ [6] Valida limite de contatos por campanha
    │       └─ recipients.length > plan.maxContactsPerBroadcast → lança BROADCAST_CONTACT_LIMIT
    │
    ├─ [7] Define status inicial
    │       └─ scheduledAt presente → 'SCHEDULED'
    │          sem scheduledAt   → 'RUNNING'
    │
    ├─ [8] Persiste no banco (transaction única)
    │       ├─ Cria registro Broadcast
    │       ├─ Cria BroadcastInstance[] (N instâncias)
    │       ├─ Cria BroadcastSource[] (listas + grupos)
    │       ├─ Cria BroadcastRecipient[] (todos PENDING)
    │       └─ Cria BroadcastVariation[] (N variações)
    │
    └─ [9] Enfileira job no Redis via BroadcastProducer
            └─ delay = 0 (imediato) ou ms até scheduledAt (agendado)
```

### Passo 3 — Producer enfileira no Redis

```
BroadcastProducer.enqueue(broadcastId, tenantId, delayMs?)
    │
    └─ queue.add('send-broadcast', { broadcastId, tenantId }, {
           jobId: 'broadcast-<id>',   ← jobId fixo evita duplicatas
           delay: delayMs ?? 0,
           attempts: 1,
           removeOnComplete: true,
       })
```

> **jobId fixo**: se tentar enfileirar o mesmo broadcast duas vezes, o Bull ignora o duplicado silenciosamente.

### Passo 4 — Processor executa o disparo (worker)

```
BroadcastProcessor.handleSendBroadcast(job)
    │
    ├─ [1] Carrega broadcast do banco (com instâncias + variações)
    │
    ├─ [2] Guards de estado
    │       └─ status ∈ {CANCELLED, COMPLETED, FAILED} → skip (não executa)
    │
    ├─ [3] Filtra instâncias conectadas
    │       └─ nenhuma conectada → updateStatus(FAILED) + emite broadcast:failed
    │
    ├─ [4] Monta lista de variações
    │       ├─ Prefer: tabela BroadcastVariation (novo)
    │       └─ Fallback: messageTexts[] + messageType (legado)
    │
    ├─ [5] Marca como RUNNING + emite broadcast:started via WebSocket
    │
    └─ [6] Loop de envio (batches de 50)
            │
            ├─ findPendingRecipients(broadcastId, limit=50)
            │
            ├─ Para cada destinatário:
            │   ├─ A cada 10 msgs: verifica se status ainda é RUNNING
            │   │     └─ PAUSED/CANCELLED → para o loop imediatamente
            │   │
            │   ├─ Round-robin entre instâncias conectadas
            │   │     ex: msg1→instância0, msg2→instância1, msg3→instância0...
            │   │
            │   ├─ Sorteia variação aleatória (pickRandom)
            │   │
            │   ├─ Interpola variáveis no texto
            │   │     {{nome}}     → recipient.name
            │   │     {{telefone}} → recipient.phone
            │   │
            │   ├─ Resolve mídia (se não for TEXT)
            │   │     ├─ storage key → download + converte base64 (cacheado)
            │   │     └─ URL pública → passa direto
            │   │
            │   ├─ Envia via WhatsAppService (adapter Evolution API)
            │   │     TEXT     → sendText()
            │   │     IMAGE    → sendImage()
            │   │     VIDEO    → sendVideo()
            │   │     AUDIO    → sendAudio()
            │   │     DOCUMENT → sendDocument()
            │   │
            │   ├─ Sucesso → updateRecipientStatus(SENT) + incrementCounters(sentCount)
            │   ├─ Falha   → updateRecipientStatus(FAILED, reason) + incrementCounters(failedCount)
            │   │
            │   └─ Aguarda `delay` segundos antes da próxima mensagem
            │
            ├─ A cada 5 mensagens → emite broadcast:progress via WebSocket
            │     { broadcastId, sent, failed, total }
            │
            └─ Sem mais PENDING → sai do loop
                    │
                    ├─ updateStatus(COMPLETED, completedAt)
                    └─ emite broadcast:completed via WebSocket
```

---

## Ciclo de Vida de Status

```
                    ┌──────────────────────────────────────┐
                    │                                      │
       criou sem    │                          criou com   │
       scheduledAt  │                          scheduledAt │
                    ▼                                      ▼
               [RUNNING] ◄──── resume() ────── [SCHEDULED]
                    │                               │
                    │ pause()              cancel() │
                    ▼                               ▼
               [PAUSED]                       [CANCELLED]
                    │
          loop concluído │ erro fatal
                    ▼
          [COMPLETED] / [FAILED]
```

### Transições permitidas
| Status atual | Ação | Status resultante |
|---|---|---|
| `RUNNING` | pause() | `PAUSED` |
| `PAUSED` | resume() | `RUNNING` + novo job enfileirado |
| `SCHEDULED` | cancel() | `CANCELLED` + job removido do Redis |
| `RUNNING` | cancel() | `CANCELLED` |
| `PAUSED` | cancel() | `CANCELLED` |
| qualquer | delete() | soft delete (se não for RUNNING) |

---

## Eventos WebSocket (tempo real)

O frontend se inscreve na sala `tenant:<tenantId>` e recebe:

| Evento | Payload | Quando |
|---|---|---|
| `broadcast:started` | `{ broadcastId, name, total }` | Processor começa o loop |
| `broadcast:progress` | `{ broadcastId, sent, failed, total }` | A cada 5 mensagens enviadas |
| `broadcast:completed` | `{ broadcastId, sent, failed, total }` | Loop finalizado com sucesso |
| `broadcast:failed` | `{ broadcastId, reason }` | Nenhuma instância conectada ou erro fatal |
| `broadcast:paused` | `{ broadcastId }` | Pause solicitado (gateway não emitido automaticamente ainda) |

---

## Interpolação de Variáveis

O texto de cada variação suporta substituição dinâmica por destinatário:

| Variável | Substituído por |
|---|---|
| `{{nome}}` | `recipient.name` ou `recipient.contact.name` |
| `{{telefone}}` | `recipient.phone` |

**Exemplo:**
```
"Olá {{nome}}, seu pedido está pronto! Responda para confirmar."
→ "Olá João Silva, seu pedido está pronto! Responda para confirmar."
```

---

## Cache de Mídia

Para evitar múltiplos downloads do storage em broadcasts com centenas de destinatários e a mesma mídia, o processor usa um `Map` em memória:

```
mediaBase64Cache: Map<storageKey, { base64, mimetype }>
```

- Primeira mensagem com `storage/abc.jpg` → faz download, converte base64, guarda no cache
- Mensagens seguintes com a mesma key → lê do cache (sem nova requisição)
- Cache é limpo ao final do broadcast (sucesso ou erro)

---

## Fluxo de Retomada após Pausa

Quando o usuário clica em "Retomar":

```
POST /broadcasts/:id/resume
    │
    ├─ Verifica status === 'PAUSED' (senão lança erro)
    ├─ updateStatus(RUNNING)
    └─ producer.enqueue(id, tenantId)   ← novo job sem delay
            │
            ▼
    Processor pega o job e reinicia o loop
    → findPendingRecipients() retorna apenas os ainda PENDING
    → os já SENT/FAILED são ignorados automaticamente
```

---

## Agendamento

Quando `scheduledAt` é informado:

```
delayMs = scheduledAt.getTime() - Date.now()
queue.add('send-broadcast', data, { delay: delayMs })
```

O Bull/Redis mantém o job em estado `delayed` até a hora configurada, então o move para a fila de execução. Se a instância da API reiniciar antes do prazo, o Redis preserva o job e ele é processado normalmente quando o worker registrar.

---

## Verificação de Limites do Plano

Antes de criar uma campanha, o sistema verifica:

| Limite | Campo no plano | Erro lançado |
|---|---|---|
| Campanhas por dia | `maxBroadcastsPerDay` | `BROADCAST_DAILY_LIMIT` |
| Contatos por campanha | `maxContactsPerBroadcast` | `BROADCAST_CONTACT_LIMIT` |

Se o tenant não tiver plano vinculado, os limites são ignorados.

---

## Pontos de Atenção / Possíveis Falhas

| Situação | Comportamento |
|---|---|
| Instância desconecta durante o disparo | Mensagens enviadas via essa instância falharão individualmente; as demais continuam |
| API reinicia durante um disparo | O job volta ao início (status no DB ainda é `RUNNING`); o processor detecta `RUNNING` e continua, mas `sentCount` pode ficar inconsistente pois refaz tentativas de destinatários já enviados (os registros SENT são ignorados pelo `findPendingRecipients`) |
| Redis indisponível | Jobs não são enfileirados; o broadcast fica em `RUNNING` no DB sem ser processado |
| Storage indisponível | Download da mídia lança exceção; o broadcast vai para `FAILED` |
| `delay = 0` | Sem intervalo entre mensagens — risco de ban no WhatsApp |
