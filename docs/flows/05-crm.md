# Fluxo — CRM

## Visão Geral

Gestão completa de contatos com histórico de conversas, tags,
funil de vendas em Kanban e timeline de atividades.

---

## Fluxo de Entrada de Contato

```mermaid
flowchart TD
    A{De onde vem o contato?} --> B[Manual]
    A --> C[Conversa no Inbox]
    A --> D[Extração de grupo]
    A --> E[Importação CSV\nv1.5]

    B --> F[Usuário clica Novo Contato]
    F --> G[Preenche: nome, número,\nempresa, e-mail, tags]

    C --> H{Contato já existe?}
    H -- Não --> I[Cria contato automaticamente\nao iniciar atendimento]
    H -- Sim --> J[Vincula conversa\nao contato existente]

    D --> K[Fluxo de extração de membros\nver fluxo 02]
    K --> I

    G --> L[Contato criado no CRM]
    I --> L
    J --> L
```

---

## Fluxo de Gestão do Contato

```mermaid
flowchart TD
    A([Usuário abre contato]) --> B[Visualiza perfil completo]

    B --> C[Aba: Informações]
    C --> C1[Nome, número, empresa,\ne-mail, tags, notas]
    C1 --> C2[Edita qualquer campo]
    C2 --> C3[Salva]

    B --> D[Aba: Histórico de conversas]
    D --> D1[Lista todas as conversas\nordenadas por data]
    D1 --> D2[Clica em conversa\nAbre histórico completo]

    B --> E[Aba: Timeline]
    E --> E1[Linha do tempo de eventos:\nmensagens, mudanças de etapa,\nnotas, ações da IA]

    B --> F[Aba: Funil]
    F --> F1[Em qual etapa do funil está]
    F1 --> F2[Move para outra etapa]
    F2 --> F3[Registra na timeline]
```

---

## Fluxo do Funil Kanban

```mermaid
flowchart TD
    A([Usuário acessa Funil]) --> B[Visualiza colunas do Kanban]
    B --> B1[Colunas padrão:\nNovo Lead → Contato feito →\nProposta enviada → Negociação → Ganho / Perdido]

    B --> C{Ação}

    C -- Mover contato --> D[Drag and drop do card\nentre colunas]
    D --> E[Atualiza etapa do contato]
    E --> F[Registra evento na timeline]

    C -- Personalizar funil --> G[Clica em Configurar Etapas]
    G --> H[Adiciona / renomeia /\nreordena / remove etapas]
    H --> I[Salva configuração do funil\npor tenant]

    C -- Ver detalhes --> J[Clica no card do contato]
    J --> K[Abre painel lateral\ncom dados do contato]
    K --> L{Ação no painel}
    L -- Enviar mensagem --> M[Abre nova conversa no Inbox]
    L -- Adicionar nota --> N[Nota salva na timeline]
    L -- Mover etapa --> D
```

---

## Fluxo de Tags e Segmentação

```mermaid
flowchart TD
    A[Usuário acessa contato] --> B[Clica em Adicionar Tag]
    B --> C{Tag existe?}
    C -- Sim --> D[Seleciona tag existente]
    C -- Não --> E[Cria nova tag com cor]
    D --> F[Tag aplicada ao contato]
    E --> F

    F --> G[Contato aparece em filtros\npor esta tag]
    G --> H[Usuário pode criar\ncampanha segmentada\npor esta tag]
```

---

## Fluxo de Notas Internas

```mermaid
flowchart TD
    A[Usuário clica Adicionar Nota] --> B[Escreve nota sobre o contato\nex: cliente interessado no plano Pro]
    B --> C[Salva nota]
    C --> D[Nota aparece na timeline]
    D --> E[Visível para todos os\nagentes do tenant]
```

---

## Estados de um Contato no Funil

```mermaid
stateDiagram-v2
    [*] --> NovoLead : Contato criado
    NovoLead --> ContatoFeito : Primeiro contato realizado
    ContatoFeito --> PropostaEnviada : Proposta enviada
    PropostaEnviada --> Negociacao : Cliente negociando
    Negociacao --> Ganho : Fechou negócio
    Negociacao --> Perdido : Desistiu
    Perdido --> NovoLead : Reengajamento
    Ganho --> [*]
```

---

## Tabelas envolvidas

| Tabela | Descrição |
|---|---|
| `contacts` | Dados do contato: nome, número, empresa, email |
| `contact_tags` | Tags aplicadas ao contato |
| `tags` | Tags disponíveis no tenant |
| `funnel_stages` | Etapas do funil customizadas por tenant |
| `contact_funnel` | Em qual etapa cada contato está |
| `contact_notes` | Notas internas por contato |
| `contact_timeline` | Eventos registrados na timeline |

---

## Eventos WebSocket emitidos

| Evento | Quando |
|---|---|
| `crm:contact_updated` | Dados do contato alterados |
| `crm:stage_changed` | Contato movido no funil |
| `crm:note_added` | Nova nota adicionada |
