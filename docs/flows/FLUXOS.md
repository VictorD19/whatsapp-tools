# Fluxogramas do Sistema

> Visualize no GitHub ou em qualquer editor com suporte a Mermaid (VSCode + extensão, Obsidian, etc.)

---

## 1. Módulo de Instâncias — Ciclo de vida

```mermaid
flowchart TD
    A([Usuário clica\n'Nova Instância']) --> B[Preenche nome]
    B --> C{API cria na\nEvolution API}
    C -->|Erro| D[Exibe erro\nEVOLUTION_SYNC_FAILED]
    C -->|OK| E[(Salva no banco\nstatus: DISCONNECTED)]
    E --> F[Card aparece no grid\n🔴 Desconectado]

    F --> G([Usuário clica\n'Conectar'])
    G --> H[API solicita QR\npara Evolution]
    H --> I[WebSocket emite\ninstance:qr_updated]
    I --> J[Modal abre com QR Code\nCountdown 30s]

    J --> K{Usuário\nescaneia?}
    K -->|Não / Expirou| L[QR atualiza\nautomaticamente]
    L --> J
    K -->|Sim| M[Evolution dispara\nwebhook connection.update]

    M --> N[Fila webhook-inbound\nBullMQ]
    N --> O[Atualiza banco\nstatus: CONNECTED\nphone: número]
    O --> P[WebSocket emite\ninstance:connected]
    P --> Q[Card atualiza\n🟢 Conectado]

    Q --> R{Usuário desconecta\nou celular sai?}
    R -->|Desconexão manual| S[API chama Evolution\ndisconnect]
    R -->|Celular deslogou| T[Evolution dispara\nwebhook disconnected]
    S --> U[Atualiza banco\nstatus: DISCONNECTED]
    T --> U
    U --> V[WebSocket emite\ninstance:disconnected]
    V --> F

    style A fill:#10B981,color:#fff
    style G fill:#10B981,color:#fff
    style D fill:#EF4444,color:#fff
    style Q fill:#10B981,color:#fff
    style F fill:#6B7280,color:#fff
```

---

## 2. Inbox — Chegada de uma mensagem

```mermaid
flowchart TD
    A([Cliente envia mensagem\nno WhatsApp]) --> B[Evolution API recebe]
    B --> C[Webhook → POST /webhooks/evolution/:id]
    C --> D[EvolutionAdapter normaliza\npara InboundWebhookDto]
    D --> E[Job na fila\nwebhook-inbound]

    E --> F{Conversa\njá existe?}
    F -->|Não| G[Cria Contact\nse não existir]
    G --> H[Cria Conversation\nstatus: PENDING]
    F -->|Sim e CLOSE| H
    F -->|Sim e ativa| I[Adiciona mensagem\nà conversa existente]

    H --> J{Instância tem\nAssistente Virtual\nconfigurado?}
    I --> K[Emite WS\nconversation:new_message]

    J -->|Não| L[status: PENDING\nEntra na fila de espera]
    J -->|Sim| M[status: WITH_ASSIST\nAssistente IA responde]

    L --> N[Emite WS\nconversation:created\npara todos os atendentes]
    M --> O[Emite WS\nconversation:created com flag bot]

    style A fill:#25D366,color:#fff
    style M fill:#3B82F6,color:#fff
    style L fill:#F59E0B,color:#fff
    style K fill:#10B981,color:#fff
```

---

## 3. Inbox — Fluxo do Assistente Virtual (IA)

```mermaid
flowchart TD
    A([Conversa chega\nstatus: WITH_ASSIST]) --> B[Assistente recebe mensagem]
    B --> C[Envia para Claude API\ncom contexto do assistente]
    C --> D{IA consegue\nresponder?}

    D -->|Sim| E[Gera resposta]
    E --> F[Salva Message\nfromBot: true]
    F --> G[WhatsAppService.sendText\nvia instância original]
    G --> H[Emite WS\nconversation:new_message]
    H --> I{Cliente respondeu\nde novo?}
    I -->|Sim| B
    I -->|Não| J([Aguarda próxima\nmensagem])

    D -->|Não / Limite| ESCALA[IA sinaliza\nque não conseguiu]
    ESCALA --> ESCALA2[Gera resumo automático\nda conversa via Claude]
    ESCALA2 --> ESCALA3[Salva conversation.summary\n'IA atendeu: usuário relatou X,\ntentou Y, não resolveu']
    ESCALA3 --> ESCALA4[status: PENDING\ntag: escalonado]
    ESCALA4 --> ESCALA5[Emite WS\nconversation:escalated]
    ESCALA5 --> ESCALA6([Atendente vê na fila\ncom resumo visível])

    A --> O{Atendente clica\n'Assumir' a qualquer\nmomento?}
    O -->|Sim| P[POST /inbox/:id/assign]
    P --> Q[status: OPEN\nassignedTo: atendente]
    Q --> R[Emite WS\nconversation:assigned]
    R --> S([Atendente responde\nmanualmente])

    style A fill:#3B82F6,color:#fff
    style ESCALA4 fill:#F59E0B,color:#fff
    style ESCALA2 fill:#8B5CF6,color:#fff
    style ESCALA3 fill:#8B5CF6,color:#fff
    style Q fill:#10B981,color:#fff
    style S fill:#10B981,color:#fff
```

---

## 3b. Inbox — Encerramento assistido pela IA

> A IA valida com o usuário se o problema foi resolvido antes de encerrar.
> Esse fluxo ocorre ao final de toda conversa tratada pelo Assistente Virtual.

```mermaid
flowchart TD
    A([IA avalia que\natendimento chegou\nao fim]) --> B[Envia mensagem\nde validação ao cliente]
    B --> C["'Conseguimos resolver\nseu problema? 😊'"]
    C --> D{Cliente responde}

    D -->|Sim / Confirmou| E[IA registra resolução]
    E --> F[status: CLOSE\nclosedAt: agora]
    F --> G[Emite WS\nconversation:closed]
    G --> H([Conversa encerrada\nautomaticamente ✅])

    D -->|Não / Ainda com dúvida| I[IA pede desculpas\ne informa transferência]
    I --> J["'Vou transferir você para\num de nossos atendentes'"]
    J --> K[Claude gera resumo\nda conversa inteira]
    K --> L["Salva conversation.summary\nEx: 'Cliente perguntou sobre\nplano X, IA explicou preços,\ncliente quer negociar desconto'"]
    L --> M[status: PENDING\ntag: escalonado\ntag: resumo-ia]
    M --> N[Emite WS\nconversation:escalated]
    N --> O([Atendente vê na fila\ncom banner de resumo])

    O --> P[Atendente abre\na conversa]
    P --> Q[Vê banner amarelo\nno topo da thread]
    Q --> R["📋 Resumo da IA:\n'Cliente perguntou sobre\nplano X...'"]
    R --> S([Atendente continua\no atendimento\ncom contexto completo])

    D -->|Sem resposta\npor 10 min| T[IA encerra\npor inatividade]
    T --> F

    style A fill:#3B82F6,color:#fff
    style F fill:#6B7280,color:#fff
    style H fill:#10B981,color:#fff
    style K fill:#8B5CF6,color:#fff
    style L fill:#8B5CF6,color:#fff
    style M fill:#F59E0B,color:#fff
    style Q fill:#F59E0B,color:#fff
    style S fill:#10B981,color:#fff
    style T fill:#6B7280,color:#fff
```

---

## 4. Inbox — Atendente humano (fluxo completo)

```mermaid
flowchart TD
    A([Atendente abre\no Inbox]) --> B[Vê aba PENDENTES]
    B --> C{Tem conversas\npendentes?}
    C -->|Não| D[Empty state\naguardando...]
    C -->|Sim| E[Clica em\numa conversa]

    E --> F[POST /inbox/:id/assign]
    F --> G{Conversa ainda\ndisponível?}
    G -->|Não, outro pegou| H[Erro: já assumida\nVolta para lista]
    G -->|Sim| I[status: OPEN\nassignedTo: eu]

    I --> J[Conversa vai para\naba MINHAS]
    J --> K([Atendente lê histórico\ne responde])

    K --> L[POST /inbox/:id/messages\nbody: texto]
    L --> M[WhatsAppService.sendText\nvia instância original]
    M --> N[Salva Message\nfromMe: true]
    N --> O{Cliente\nrespondeu?}

    O -->|Sim| P[WebSocket emite\nconversation:new_message]
    P --> Q[Notificação no browser\nbadge + som]
    Q --> K

    O -->|Não por um tempo| R{Atendente\nresolveu?}
    R -->|Não| K
    R -->|Sim| S[POST /inbox/:id/close]
    S --> T[status: CLOSE\nclosedAt: agora]
    T --> U[Emite WS\nconversation:closed]
    U --> V([Conversa sai das\nabas ativas])

    V --> W{Cliente manda\nmensagem depois?}
    W -->|Sim| X[NOVO atendimento\nNova Conversation\nstatus: PENDING]
    W -->|Não| Y([Fim])

    X --> B

    style A fill:#10B981,color:#fff
    style H fill:#EF4444,color:#fff
    style I fill:#10B981,color:#fff
    style T fill:#6B7280,color:#fff
    style X fill:#F59E0B,color:#fff
```

---

## 5. Visão geral — Status e transições

```mermaid
stateDiagram-v2
    [*] --> PENDING : mensagem chega\nsem assistente

    [*] --> WITH_ASSIST : mensagem chega\ncom assistente configurado

    WITH_ASSIST --> WITH_ASSIST : IA responde\nnormalmente

    WITH_ASSIST --> OPEN : atendente assume\na qualquer momento

    WITH_ASSIST --> PENDING : IA não conseguiu resolver\nou usuário disse NÃO\n→ gera summary + tag escalonado

    WITH_ASSIST --> CLOSE : IA validou com usuário\ne ele confirmou resolução\nou inatividade 10min

    PENDING --> OPEN : atendente assume

    OPEN --> CLOSE : atendente encerra

    CLOSE --> PENDING : cliente manda nova mensagem\n(novo atendimento, mesmo contato)
```

---

## 6. Modelo de dados — Relacionamentos

```mermaid
erDiagram
    TENANT ||--o{ INSTANCE : "tem"
    TENANT ||--o{ USER : "tem"
    TENANT ||--o{ CONTACT : "tem"
    TENANT ||--o{ CONVERSATION : "tem"
    TENANT ||--o{ ASSISTANT : "tem"

    INSTANCE ||--o{ CONVERSATION : "recebe"

    CONTACT ||--o{ CONVERSATION : "participa"

    CONVERSATION ||--o{ MESSAGE : "contém"
    CONVERSATION }o--|| USER : "assignedTo (nullable)"
    CONVERSATION }o--|| ASSISTANT : "assistantId (nullable)"

    INSTANCE {
        string id
        string tenantId
        string name
        string phone
        enum status
        string evolutionId
    }

    CONVERSATION {
        string id
        string tenantId
        string instanceId
        string contactId
        string assignedToId
        string assistantId
        enum status
        string[] tags
        string summary
        int unreadCount
        datetime lastMessageAt
        datetime closedAt
    }

    MESSAGE {
        string id
        string conversationId
        boolean fromMe
        boolean fromBot
        string body
        enum type
        enum status
        string evolutionId
    }

    CONTACT {
        string id
        string tenantId
        string phone
        string name
        string[] tags
    }
```

---

## 7. Arquitetura de WebSocket — Rooms

```mermaid
flowchart LR
    subgraph SERVER["Servidor (Socket.io)"]
        GW[Gateway]
        GW --> R1[Room: tenant:abc123]
        GW --> R2[Room: tenant:xyz789]
    end

    subgraph TENANT_A["Tenant A"]
        A1[Atendente 1] --> R1
        A2[Atendente 2] --> R1
        A3[Admin] --> R1
    end

    subgraph TENANT_B["Tenant B"]
        B1[Atendente 1] --> R2
    end

    subgraph EVENTS["Eventos emitidos"]
        E1[conversation:created]
        E2[conversation:new_message]
        E3[conversation:assigned]
        E4[conversation:closed]
        E5[conversation:escalated]
        E6[instance:status_changed]
        E7[instance:qr_updated]
        E8[instance:connected]
        E9[instance:disconnected]
    end

    R1 --> EVENTS
```
