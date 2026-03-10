# Plano: Remetente Individual em Mensagens de Grupo

**Issue:** #88
**Status:** Pendente
**Contexto:** Em grupos do WhatsApp, cada mensagem é enviada por um participante diferente. Hoje o campo de remetente não é salvo na tabela `Message`, então o bubble de chat não consegue mostrar o nome/número de quem enviou — ao contrário do WhatsApp.

---

## Diagnóstico

| Dado | Disponível hoje? |
|---|---|
| `fromMe` (enviado por mim) | ✅ salvo |
| Nome/telefone do contato (chat 1:1) | ✅ salvo em `Contact` |
| JID do remetente (grupo) | ❌ não salvo |
| Nome do remetente (grupo) | ❌ não salvo |

No webhook (`inbox-webhook.processor.ts`), o `key.participant` contém o JID do membro que enviou e `pushName` tem o nome dele — mas nada disso é persistido na tabela `Message`.

---

## Camadas impactadas (em ordem de execução)

### 1. Banco de dados — Migration

Adicionar dois campos opcionais ao model `Message` no Prisma:

```prisma
model Message {
  // ... campos existentes ...
  senderJid   String?   // JID do remetente (preenchido em grupos)
  senderName  String?   // pushName do remetente (preenchido em grupos)
}
```

- Nome da migration: `20260310_message_add_sender_fields`
- Campos são `String?` — nulos em chats 1:1 e em mensagens antigas
- Índice **não necessário** (não é usado em filtros/buscas)

### 2. Backend — Webhook Processor

Em `apps/api/src/modules/inbox/queues/inbox-webhook.processor.ts`, ao criar a mensagem:

```typescript
// Antes (apenas para reações)
const senderJid = (key.participant as string | undefined) ?? (fromMe ? 'me' : phone)

// Agora: também salvar na mensagem
const msgSenderJid = isGroup
  ? (key.participant as string | undefined) ?? undefined
  : undefined

const msgSenderName = isGroup && !fromMe
  ? (pushName ?? undefined)
  : undefined
```

Passar `senderJid` e `senderName` ao chamar `inboxRepository.createMessage(...)`.

### 3. Backend — Repository

Em `apps/api/src/modules/inbox/inbox.repository.ts`:

- Adicionar `senderJid` e `senderName` ao `data` do `createMessage`
- Incluir ambos no `select` dos métodos `getMessages` e `getMessage`

### 4. Backend — API Response

Verificar se o controller/serviço expõe os campos — se o repository já os retorna no `select`, devem aparecer automaticamente na resposta JSON.

### 5. Frontend — Store

Em `apps/web/src/stores/inbox.store.ts`, interface `Message`:

```typescript
export interface Message {
  // ... campos existentes ...
  senderJid: string | null
  senderName: string | null
}
```

### 6. Frontend — MessageBubble

Em `apps/web/src/components/inbox/message-bubble.tsx`:

- Usar `message.senderName ?? message.senderJid` para exibir o remetente em mensagens de grupo
- Em chats 1:1, `senderJid` e `senderName` serão `null` → manter comportamento atual com `contactName`

Lógica no componente:

```tsx
// Para mensagens recebidas (!fromMe):
// - Se senderName ou senderJid existir → é grupo → mostrar remetente individual
// - Caso contrário → é 1:1 → mostrar contactName
const senderLabel = message.senderName
  ?? message.senderJid?.replace(/@s\.whatsapp\.net$/, '')
  ?? contactName
```

Em `message-thread.tsx`, a prop `contactPhone` pode ser simplificada — no grupo o remetente vem do próprio `message`, então `contactPhone` só é relevante em 1:1.

---

## Ordem de implementação

```
[1] Migration (schema + prisma generate)
[2] Repository (createMessage + selects)
[3] Webhook Processor (extrair e salvar senderJid/senderName)
[4] Frontend Store (interface Message)
[5] MessageBubble (lógica de exibição)
[6] Testes unitários (inbox.service.spec.ts)
```

---

## Notas técnicas

- `key.participant` só existe em mensagens de grupo — em 1:1 é `undefined`
- `pushName` em grupos pode ser `undefined` se o contato não tiver nome salvo no WhatsApp
- Mensagens antigas ficarão com `senderJid = null` — o bubble volta ao fallback `contactName`
- Não é necessário backfill — dados históricos de grupo ficam sem remetente (aceitável)
- Mensagens enviadas por mim (`fromMe = true`) em grupos: `senderJid` fica `null` (não precisamos mostrar "você" com JID)

---

## Closes

closes #88
