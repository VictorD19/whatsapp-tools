# RULE: Camada de Abstração do WhatsApp Provider

## Princípio

O sistema NUNCA chama Evolution API (ou qualquer lib WhatsApp) diretamente.
Todo acesso passa pela interface `IWhatsAppProvider`.
Trocar de provider = criar um novo adapter. Zero impacto no restante do sistema.

Padrão: **Hexagonal Architecture — Ports & Adapters**

---

## Estrutura obrigatória

```
modules/whatsapp/
├── ports/
│   └── whatsapp-provider.interface.ts   ← contrato (nunca muda)
├── adapters/
│   ├── evolution/
│   │   ├── evolution.adapter.ts         ← implementação Evolution API
│   │   └── evolution-http.client.ts     ← HTTP client isolado
│   └── meta-cloud/                      ← exemplo de troca futura
│       └── meta-cloud.adapter.ts
├── dto/
│   ├── send-message.dto.ts              ← DTOs internos (agnósticos de provider)
│   └── instance.dto.ts
├── whatsapp.module.ts                   ← injeta o adapter via config
└── whatsapp.service.ts                  ← usa apenas IWhatsAppProvider
```

---

## A Interface — Port (nunca muda)

```typescript
// modules/whatsapp/ports/whatsapp-provider.interface.ts

export interface IWhatsAppProvider {
  // Instâncias
  createInstance(config: CreateInstanceDto): Promise<InstanceResult>
  connectInstance(instanceId: string): Promise<QRCodeResult>
  disconnectInstance(instanceId: string): Promise<void>
  deleteInstance(instanceId: string): Promise<void>
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>

  // Mensagens
  sendText(instanceId: string, to: string, text: string): Promise<MessageResult>
  sendImage(instanceId: string, to: string, payload: ImagePayload): Promise<MessageResult>
  sendVideo(instanceId: string, to: string, payload: VideoPayload): Promise<MessageResult>
  sendAudio(instanceId: string, to: string, payload: AudioPayload): Promise<MessageResult>
  sendDocument(instanceId: string, to: string, payload: DocumentPayload): Promise<MessageResult>

  // Grupos
  getGroups(instanceId: string): Promise<Group[]>
  getGroupMembers(instanceId: string, groupId: string): Promise<GroupMember[]>
  sendGroupMention(instanceId: string, groupId: string, payload: MentionPayload): Promise<MessageResult>

  // Webhook
  setWebhook(instanceId: string, url: string, events: WebhookEvent[]): Promise<void>
}
```

---

## O Adapter — Evolution API

```typescript
// modules/whatsapp/adapters/evolution/evolution.adapter.ts

@Injectable()
export class EvolutionAdapter implements IWhatsAppProvider {
  constructor(private readonly http: EvolutionHttpClient) {}

  async sendText(instanceId: string, to: string, text: string): Promise<MessageResult> {
    // traduz para o formato do Evolution API
    const response = await this.http.post(`/message/sendText/${instanceId}`, {
      number: to,
      text,
    })
    // traduz resposta para o formato interno
    return { messageId: response.key.id, status: 'sent' }
  }

  // ... demais métodos
}
```

---

## Injeção via Token (trocar adapter = mudar config)

```typescript
// modules/whatsapp/whatsapp.module.ts

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER'

@Module({
  providers: [
    {
      provide: WHATSAPP_PROVIDER,
      useClass: EvolutionAdapter,     // ← trocar aqui para MetaCloudAdapter
    },
    WhatsAppService,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
```

---

## O Service — usa apenas a interface

```typescript
// modules/whatsapp/whatsapp.service.ts

@Injectable()
export class WhatsAppService {
  constructor(
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: IWhatsAppProvider,   // ← nunca sabe qual adapter
  ) {}

  async sendMessage(instanceId: string, to: string, text: string) {
    return this.provider.sendText(instanceId, to, text)
  }
}
```

---

## Regras obrigatórias

1. **Nenhum módulo importa** `EvolutionAdapter`, `EvolutionHttpClient` ou qualquer classe de adapter diretamente
2. **Todos os módulos** que precisam enviar mensagem injetam `WhatsAppService` — nunca o provider
3. **DTOs internos** (ex: `MessageResult`, `Group`) são agnósticos de provider — não expõem campos específicos do Evolution
4. **Webhooks recebidos** são normalizados pelo adapter antes de entrar no sistema (formato interno fixo)
5. Para adicionar novo provider: criar `adapters/novo-provider/novo.adapter.ts` implementando `IWhatsAppProvider` e trocar o `useClass` no módulo
6. **Nunca** vazar tipos do Evolution API (`BaileysEventEmitter`, `proto.IMessage`, etc.) para fora do adapter

---

## Como trocar de provider no futuro

1. Criar `adapters/meta-cloud/meta-cloud.adapter.ts` implementando `IWhatsAppProvider`
2. No `whatsapp.module.ts`, trocar `useClass: EvolutionAdapter` → `useClass: MetaCloudAdapter`
3. Nenhum outro arquivo muda.

---

## Normalização de Webhooks

Todo webhook recebido entra no sistema como `InboundWebhookDto` — formato interno:

```typescript
interface InboundWebhookDto {
  instanceId: string      // id interno da instância
  tenantId: string        // extraído do nome da instância
  event: WebhookEvent     // MESSAGE_RECEIVED | STATUS_UPDATE | CONNECTED | DISCONNECTED
  payload: unknown        // normalizado pelo adapter
  receivedAt: string
}
```

O adapter traduz o payload específico do Evolution para este formato antes de publicar na fila.
