# Checklist: Envio de Midias no Chat (Inbox)

## Passo 1 — Analise previa

| Pergunta | Resposta |
|---|---|
| **Feature mapeada?** | Sim — FEATURES.md v1.0, item 1 (Disparo em Massa: "Suporte a texto, imagem, video, documento e audio") + item 4 (Inbox: envio de mensagens) |
| **Modulo responsavel?** | `inbox` (ja existe) — metodo `sendMessage` expandido para midias |
| **Banco de dados?** | Nenhuma alteracao — tabela `Message` ja tem campos `type` (ENUM), `mediaUrl`, `evolutionId` |
| **Fila necessaria?** | Nao — envio de midia e sincrono via Evolution API (mesma logica do sendText) |
| **Erros possiveis?** | `MEDIA_UPLOAD_FAILED` (novo), `UNSUPPORTED_MEDIA_TYPE` (novo), `FILE_TOO_LARGE` (novo) |
| **WebSocket?** | Sim — mesmo pattern do `sendMessage` (ja emite via `gateway.emitNewMessage`) |
| **Impacto multi-tenant?** | Zero risco — mesmo pattern de isolamento por `tenantId` |

## Passo 2 — Checklist de conformidade

- [x] Modulo expoe apenas o `service` — nunca o `repository` para fora
- [x] Endpoint coberto pelo `TenantGuard` (controller InboxController ja tem guard global)
- [x] Queries filtram por `tenantId`
- [ ] Novos codigos de erro registrados em `error-codes.ts` → `MEDIA_UPLOAD_FAILED`, `UNSUPPORTED_MEDIA_TYPE`, `FILE_TOO_LARGE`
- [x] Resposta segue envelope padrao `{ data }` — retorna Message do DB
- [ ] Validacao via multipart (tipo de arquivo, tamanho max 50MB)
- [x] Operacao sincrona — nao precisa de fila
- [ ] Teste unitario no service para `sendMediaMessage`
- [x] Variaveis de ambiente — nenhuma nova

## Passo 3 — Arquivos a modificar/criar

### Backend
| Arquivo | Acao |
|---|---|
| `apps/api/src/main.ts` | Registrar `@fastify/multipart` |
| `apps/api/src/core/errors/error-codes.ts` | Adicionar 3 novos codigos |
| `apps/api/src/modules/inbox/inbox.controller.ts` | Novo endpoint `POST /conversations/:id/media` |
| `apps/api/src/modules/inbox/inbox.service.ts` | Novo metodo `sendMediaMessage()` |
| `apps/api/src/modules/inbox/__tests__/inbox.service.spec.ts` | Testes para `sendMediaMessage` |

### Frontend
| Arquivo | Acao |
|---|---|
| `apps/web/src/lib/api.ts` | Adicionar helper `apiUpload()` para FormData |
| `apps/web/src/hooks/use-conversation.ts` | Adicionar `sendMedia()` |
| `apps/web/src/components/inbox/message-input.tsx` | Wiring dos botoes de anexo com `<input type="file">` + preview |
| `apps/web/src/components/inbox/message-thread.tsx` | Passar `onSendMedia` para MessageInput |

## Passo 4 — Fluxo tecnico

```
Frontend                    Backend                     Evolution API
   |                           |                            |
   | 1. User clica Paperclip   |                            |
   |    → seleciona arquivo    |                            |
   |                           |                            |
   | 2. FormData(file+caption) |                            |
   | ──POST /conversations/    |                            |
   |   :id/media──────────────>|                            |
   |                           | 3. Lê buffer do arquivo    |
   |                           |    Converte p/ base64      |
   |                           |    Detecta mimetype→type   |
   |                           |                            |
   |                           | 4. whatsapp.sendImage()    |
   |                           |    ou sendVideo/Audio/Doc  |
   |                           | ──────────────────────────>|
   |                           |                            |
   |                           | 5. Salva Message no DB     |
   |                           |    type=IMAGE/VIDEO/etc    |
   |                           |    mediaUrl='has-media'    |
   |                           |                            |
   |                           | 6. Emite WebSocket         |
   |   <──────Message──────────|                            |
   |                           |                            |
   | 7. Renderiza bubble       |                            |
   |    com MediaContent       |                            |
```

## Mapeamento mimetype → type

| Mimetype | Message Type | Metodo WhatsApp |
|---|---|---|
| `image/*` | IMAGE | `sendImage()` |
| `video/*` | VIDEO | `sendVideo()` |
| `audio/*` | AUDIO | `sendAudio()` |
| `*` (outros) | DOCUMENT | `sendDocument()` |

## Limites do WhatsApp (Evolution API)

| Tipo | Tamanho max |
|---|---|
| Imagem | 5 MB |
| Video | 16 MB |
| Audio | 16 MB |
| Documento | 100 MB |
| Sticker | 500 KB |
