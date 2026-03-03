# Fluxo — Menções em Grupos

## Visão Geral

Usuário lista grupos do WhatsApp conectado, extrai membros
e envia mensagens mencionando todos ou membros específicos.

---

## Fluxo Principal

```mermaid
flowchart TD
    A([Usuário acessa Grupos]) --> B{Tem instância\nconectada?}
    B -- Não --> C[Redireciona para\nConectar Instância]
    B -- Sim --> D[Seleciona instância WhatsApp]

    D --> E[Clica em Carregar Grupos]
    E --> F[Busca grupos via IWhatsAppProvider.getGroups]
    F --> G[Lista grupos com nome,\nfoto e nº de membros]

    G --> H[Usuário seleciona um grupo]

    H --> I{Ação desejada}

    I -- Extrair membros --> J[Chama getGroupMembers]
    J --> K[Lista membros com\nnome e número]
    K --> K1[Opção: Exportar lista\nou Salvar como contatos no CRM]

    I -- Enviar menção --> L[Compõe mensagem]
    L --> L1{Mencionar quem?}
    L1 -- Todos --> L2[Seleciona @todos]
    L1 -- Específicos --> L3[Seleciona membros da lista]

    L2 --> M[Define tipo de mensagem\ntexto / imagem / vídeo]
    L3 --> M

    M --> N{Enviar agora\nou agendar?}
    N -- Agora --> O[Enfileira job imediato]
    N -- Agendar --> P[Define data e hora]
    P --> O

    O --> Q[Job processa via\nWhatsAppService.sendGroupMention]
    Q --> R{Enviou?}
    R -- Sim --> S[Notificação: Mensagem enviada]
    R -- Não --> T[Retry automático\nNotificação de erro se falhar]
```

---

## Fluxo de Extração de Membros

```mermaid
flowchart TD
    A[Usuário clica Extrair Membros] --> B[Chama getGroupMembers na instância]
    B --> C[Retorna lista de membros]
    C --> D{O que fazer com a lista?}

    D -- Exportar --> E[Gera CSV para download]
    D -- Salvar no CRM --> F[Para cada membro]
    F --> G{Contato já existe\nno CRM?}
    G -- Sim --> H[Ignora / atualiza dados]
    G -- Não --> I[Cria contato novo]
    I --> J[Associa tag do grupo]
    H --> K[Resultado: X salvos\nY já existiam]
    J --> K
```

---

## Estados de uma Menção Agendada

```mermaid
stateDiagram-v2
    [*] --> Agendada : Usuário agendou
    Agendada --> EmProcessamento : Horário chegou
    EmProcessamento --> Enviada : Sucesso
    EmProcessamento --> Falha : Erro após retries
    Enviada --> [*]
    Falha --> [*]
```

---

## Tabelas envolvidas

| Tabela | Descrição |
|---|---|
| `group_mentions` | Registro da menção: grupo, membros, mensagem, status |
| `group_mention_schedules` | Agendamentos pendentes |
| `contacts` | Membros salvos no CRM após extração |

---

## Eventos WebSocket emitidos

| Evento | Quando |
|---|---|
| `mention:sent` | Menção enviada com sucesso |
| `mention:failed` | Erro no envio |
