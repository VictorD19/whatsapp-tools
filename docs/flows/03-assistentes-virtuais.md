# Fluxo — Assistentes Virtuais (IA)

## Visão Geral

Usuário cria um assistente com personalidade, instruções e gatilhos.
O assistente responde mensagens automaticamente via LLM (Claude API).
Quando necessário, transfere para atendente humano.

---

## Fluxo de Criação do Assistente

```mermaid
flowchart TD
    A([Usuário acessa Assistentes]) --> B[Lista assistentes criados]
    B --> C[Clica em Novo Assistente]

    C --> D[Passo 1: Informações básicas]
    D --> D1[Nome do assistente]
    D1 --> D2[Tipo: SDR / Atendimento / Agendamento / Custom]

    D2 --> E[Passo 2: Personalidade e tom]
    E --> E1[Instrução de sistema: quem é, como fala]
    E1 --> E2[Tom: formal / casual / técnico]
    E2 --> E3[Idioma padrão: PT-BR / EN / ES]

    E3 --> F[Passo 3: Regras de comportamento]
    F --> F1[O que pode responder]
    F1 --> F2[O que NÃO pode responder]
    F2 --> F3[Quando transferir para humano:\nex: cliente irritado, pedido de reembolso]

    F3 --> G[Passo 4: Vincula à instância WhatsApp]
    G --> G1{Ativar em qual instância?}
    G1 --> G2[Seleciona instância conectada]

    G2 --> H[Passo 5: Configura gatilho]
    H --> H1{Quando ativar?}
    H1 -- Toda mensagem recebida --> H2[Sempre ativo]
    H1 -- Fora do horário --> H3[Define horário de atendimento humano]
    H1 -- Palavra-chave --> H4[Define palavras que ativam o bot]

    H2 --> I[Salva e ativa assistente]
    H3 --> I
    H4 --> I

    I --> J[Assistente ativo na instância]
```

---

## Fluxo de Atendimento pelo Assistente

```mermaid
flowchart TD
    A([Mensagem recebida no WhatsApp]) --> B[Webhook da Evolution API]
    B --> C[Fila: webhook-inbound]
    C --> D[Identifica tenant + instância]
    D --> E{Instância tem\nassistente ativo?}
    E -- Não --> F[Cai no Inbox humano]
    E -- Sim --> G{Conversa está em\natendimento humano?}
    G -- Sim --> F
    G -- Não --> H[Busca histórico da conversa\núltimas N mensagens]

    H --> I[Monta contexto para o LLM]
    I --> I1[System prompt do assistente\n+ histórico + nova mensagem]

    I1 --> J[Chama Claude API\nclaude-sonnet-4-6]
    J --> K[Recebe resposta]

    K --> L{Assistente decidiu\ntransferir?}
    L -- Sim --> M[Marca conversa como\npendente para humano]
    M --> N[Notifica agentes no Inbox]
    N --> F

    L -- Não --> O[Enfileira envio da resposta]
    O --> P[WhatsAppService.sendText]
    P --> Q[Salva mensagem no histórico]
    Q --> R[Conversa continua]
```

---

## Fluxo de Transferência para Humano

```mermaid
flowchart TD
    A{Condição de transferência} --> B[Assistente insere\nmensagem de transição\nex: Vou te conectar com um atendente]
    B --> C[Envia mensagem ao cliente]
    C --> D[Status da conversa:\nAguardando humano]
    D --> E[WebSocket notifica Inbox]
    E --> F[Agente disponível aceita]
    F --> G[Assistente desativado\nnesta conversa]
    G --> H[Agente assume atendimento]
```

---

## Estados de uma Conversa com Assistente

```mermaid
stateDiagram-v2
    [*] --> BotAtivo : Nova mensagem recebida
    BotAtivo --> ProcessandoIA : Mensagem enviada ao LLM
    ProcessandoIA --> BotAtivo : IA respondeu, aguarda próxima msg
    ProcessandoIA --> AguardandoHumano : IA decidiu transferir
    AguardandoHumano --> EmAtendimentoHumano : Agente aceitou
    EmAtendimentoHumano --> BotAtivo : Agente finalizou e devolveu ao bot
    EmAtendimentoHumano --> Resolvida : Agente resolveu
    Resolvida --> [*]
```

---

## Tabelas envolvidas

| Tabela | Descrição |
|---|---|
| `assistants` | Configuração do assistente: nome, prompt, tom, regras |
| `assistant_instances` | Vínculo assistente ↔ instância WhatsApp |
| `conversations` | Conversa com status atual |
| `messages` | Histórico completo de mensagens (contexto para IA) |

---

## Eventos WebSocket emitidos

| Evento | Quando |
|---|---|
| `assistant:responding` | IA processando resposta |
| `conversation:transferred` | Transferido para humano |
| `inbox:new_conversation` | Nova conversa aguardando agente |
