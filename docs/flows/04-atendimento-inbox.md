# Fluxo — Atendimento por Chat (Inbox)

## Visão Geral

Inbox centralizado multi-atendente. Mensagens chegam, são distribuídas
entre agentes, que atendem em tempo real com suporte a transferência e status.

---

## Fluxo de Entrada de Nova Conversa

```mermaid
flowchart TD
    A([Mensagem recebida no WhatsApp]) --> B[Webhook Evolution API]
    B --> C[Fila: webhook-inbound]
    C --> D[Identifica tenant + instância]
    D --> E{Conversa já existe\npara este contato?}

    E -- Não --> F[Cria nova conversa]
    F --> G{Instância tem\nassistente ativo?}
    G -- Sim --> H[Direciona para\nAssistente Virtual]
    G -- Não --> I[Status: Aberta\naguardando agente]
    I --> J[WebSocket notifica\ntodos os agentes online]

    E -- Sim --> K{Status da conversa?}
    K -- Resolvida --> L[Reabre conversa]
    L --> I
    K -- Aberta ou Em atendimento --> M[Adiciona mensagem\nà conversa existente]
    M --> N{Tem agente\nassignado?}
    N -- Sim --> O[Notifica agente\nassignado via WebSocket]
    N -- Não --> J
```

---

## Fluxo do Agente no Inbox

```mermaid
flowchart TD
    A([Agente acessa Inbox]) --> B[Visualiza filas]
    B --> B1[Não atribuídas]
    B --> B2[Minhas conversas]
    B --> B3[Todas as conversas]

    B1 --> C[Agente clica em uma conversa]
    C --> D[Assume conversa:\nstatus → Em atendimento\nassignedTo → agente atual]

    D --> E[Abre janela de chat]
    E --> F[Carrega histórico completo\nda conversa]

    F --> G{Ação do agente}

    G -- Responder --> H[Digita mensagem]
    H --> H1{Usar resposta rápida?}
    H1 -- Sim --> H2[Seleciona atalho de texto]
    H1 -- Não --> H3[Digita livremente]
    H2 --> I[Envia via WhatsAppService]
    H3 --> I
    I --> J[Mensagem salva no histórico]
    J --> K[Entregue ao cliente]

    G -- Transferir --> L[Seleciona outro agente]
    L --> M[Conversa transferida]
    M --> N[Notifica novo agente]

    G -- Resolver --> O[Status → Resolvida]
    O --> P[Conversa arquivada]

    G -- Adicionar nota --> Q[Nota interna\nnão visível ao cliente]
```

---

## Fluxo de Resposta Rápida

```mermaid
flowchart TD
    A[Agente digita /] --> B[Abre menu de respostas rápidas]
    B --> C[Lista atalhos configurados\nex: /saudacao, /preco, /obrigado]
    C --> D[Agente seleciona ou digita atalho]
    D --> E[Texto expandido na caixa de mensagem]
    E --> F[Agente edita se necessário]
    F --> G[Envia mensagem]
```

---

## Fluxo de Transferência entre Agentes

```mermaid
flowchart TD
    A[Agente A clica Transferir] --> B[Lista agentes disponíveis\nonline no momento]
    B --> C[Seleciona Agente B]
    C --> D[Adiciona nota de contexto\nopiconal]
    D --> E[Confirma transferência]
    E --> F[assignedTo → Agente B]
    F --> G[Notifica Agente B via WebSocket]
    G --> H[Agente B vê conversa\nem Minhas Conversas]
    H --> I[Agente A perde acesso\nà conversa]
```

---

## Estados de uma Conversa

```mermaid
stateDiagram-v2
    [*] --> Aberta : Nova mensagem recebida
    Aberta --> EmAtendimento : Agente assumiu
    EmAtendimento --> Transferida : Agente transferiu
    Transferida --> EmAtendimento : Novo agente assumiu
    EmAtendimento --> Resolvida : Agente resolveu
    Resolvida --> Aberta : Cliente respondeu novamente
    Resolvida --> [*] : Arquivada após X dias
```

---

## Tabelas envolvidas

| Tabela | Descrição |
|---|---|
| `conversations` | Conversa com status, agente assignado, instância |
| `messages` | Mensagens da conversa (entrada e saída) |
| `quick_replies` | Atalhos de texto por tenant |
| `conversation_notes` | Notas internas por conversa |
| `agents` | Referência aos users com role de agente |

---

## Eventos WebSocket emitidos

| Evento | Quando |
|---|---|
| `inbox:new_conversation` | Nova conversa sem agente |
| `inbox:new_message` | Mensagem recebida em conversa aberta |
| `inbox:conversation_assigned` | Conversa atribuída a agente |
| `inbox:conversation_transferred` | Conversa transferida |
| `inbox:conversation_resolved` | Conversa resolvida |
| `inbox:agent_typing` | Agente digitando (feedback visual) |
