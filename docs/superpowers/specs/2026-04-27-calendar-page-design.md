# Design: Página de Calendário de Eventos da IA

**Data:** 2026-04-27
**Status:** Aprovado pelo usuário

---

## Resumo

Página de calendário mensal que exibe eventos criados pelos assistentes de IA no Google Calendar. Cada assistente tem uma cor distinta. O usuário pode filtrar por assistente e clicar em eventos para ver detalhes em um Sheet lateral.

---

## Escopo

### Incluído
- Página própria no menu lateral (`/calendar`)
- Visualização mensal com FullCalendar (`@fullcalendar/react`)
- Eventos vindos do modelo `CalendarEvent` (criados pela ferramenta `CRIAR_EVENTO` da IA)
- Filtro por assistente (combobox no toolbar)
- Sheet lateral com detalhes do evento ao clicar
- Legenda de cores por assistente na base do calendário
- Destaque visual no dia atual
- Dias fora do mês em cinza claro
- Internacionalização (pt-BR, en, es)

### Não incluído
- Visualização semanal/diária (apenas mensal)
- Criação manual de evento pelo calendário
- Drag-and-drop para reagendar
- Edição/exclusão de eventos pelo calendário (gerenciado pelo Google Calendar)
- Eventos de Broadcast ou FollowUp (apenas CalendarEvent)

---

## Arquitetura

### Rota Frontend

```
apps/web/src/app/(dashboard)/calendar/page.tsx
```

### Componentes

```
apps/web/src/
├── app/(dashboard)/calendar/
│   └── page.tsx                    # Página principal
├── components/calendar/
│   ├── calendar-view.tsx           # Wrapper do FullCalendar
│   ├── calendar-toolbar.tsx        # Navegação mês + botão Hoje + filtro assistente
│   ├── calendar-event-card.tsx     # Conteúdo customizado do evento no grid
│   ├── calendar-event-detail.tsx   # Sheet lateral com detalhes
│   └── calendar-legend.tsx         # Legenda de cores por assistente
├── hooks/
│   └── use-calendar-events.ts      # Hook para buscar eventos da API
└── lib/
    └── assistant-colors.ts         # Mapa de cores por assistente
```

### API Backend

Criar novo endpoint dedicado no módulo `integrations`:

```
GET /calendar-events?start=2026-04-01&end=2026-04-30&assistantId=optional
```

**Justificativa:** Não existe endpoint público para listar CalendarEvents. O controller atual de integrações só gerencia OAuth. Precisamos criar um método no `IntegrationsService` que lista eventos com range de datas, filtrado por `tenantId`, com suporte opcional a filtro por `assistantId`.

Retorna eventos do `CalendarEvent` filtrados por `tenantId` e pelo range de datas da view mensal. Inclui relação com o assistente via `assistantId`.

### Modelo de Dados

Usar o `CalendarEvent` existente:

```prisma
model CalendarEvent {
  id              String
  tenantId        String
  integrationId   String
  externalEventId String
  title           String
  description     String?
  startAt         DateTime
  endAt           DateTime
  timezone        String
  location        String?
  attendees       Json?
  hangoutLink     String?
  status          String
  // + relação com assistente que criou (via AiToolExecution ou campo novo)
}
```

**Campo novo necessário:** Adicionar `assistantId` (opcional, nullable) ao `CalendarEvent` para vincular ao assistente que criou o evento. Isso permite o filtro por assistente e a coloração no calendário.

**Importante — Bug atual:** O tool `CRIAR_EVENTO` atualmente chama o Google Calendar API mas **não salva** o `CalendarEvent` no banco local. O método `createCalendarEvent()` existe no repository mas nunca é invocado. Precisamos:

1. Adicionar `assistantId` ao modelo `CalendarEvent` (migration)
2. Modificar `executeCriarEvento()` no `tool-executor.service.ts` para também salvar no banco local após criar no Google Calendar, incluindo o `assistantId` (disponível no `ToolContext`)
3. Criar o novo endpoint `GET /calendar-events` no `IntegrationsController`

### Fluxo de Dados

```
1. Página carrega → use-calendar-events busca eventos do mês atual
2. FullCalendar renderiza grid mensal com eventos coloridos por assistente
3. Usuário navega entre meses → hook refetch com novo range
4. Usuário seleciona assistente no filtro → refilter client-side
5. Usuário clica em evento → abre Sheet com detalhes
```

---

## UI

### Layout da Página

```
┌─────────────────────────────────────────────────┐
│ [Hoje]  ◀ Abril 2026 ▶     [🤖 Todos ▾]       │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ Dom  │ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │ Sáb  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │      │      │      │ █ evt│      │      │
│      │      │      │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │ █ evt│      │      │      │      │      │
│      │      │      │      │      │      │      │
├──────┴──────┴──────┴──────┴──────┴──────┴──────┤
│ ● SDR Bot  ● Atendente  ● Follow-up  ● Agend. │
└─────────────────────────────────────────────────┘
```

### Cores por Assistente

Usar a paleta do design system para atribuir cores distintas. Atribuição dinâmica: cada assistente recebe uma cor do pool na ordem em que aparecem. Pool de cores:

| Índice | Cor | Hex |
|--------|-----|-----|
| 0 | Verde (primary) | `#008b46` |
| 1 | Azul | `#3b82f6` |
| 2 | Amarelo | `#f59e0b` |
| 3 | Roxo | `#8b5cf6` |
| 4 | Rosa | `#ec4899` |
| 5 | Ciano | `#06b6d4` |
| 6 | Laranja | `#f97316` |
| 7 | Índigo | `#6366f1` |

### Sheet de Detalhes

Ao clicar num evento, abre Sheet à direita com:
- Título do evento
- Data/hora (formatado com `formatDateTime()`)
- Local (se houver)
- Nome do assistente que criou
- Contato associado (se houver)
- Link do Google Meet (se houver, clicável)
- Descrição

### Menu Lateral

Adicionar item "Calendar" no menu lateral (namespace `nav` dos translations), entreCRM e Instâncias (ou após Assistentes, junto às ferramentas de IA).

---

## Internacionalização

Criar namespace `calendar` nos 3 arquivos de translation:

**pt-BR:**
```json
"calendar": {
  "title": "Calendário",
  "today": "Hoje",
  "noEvents": "Nenhum evento neste período",
  "filterPlaceholder": "Todos os assistentes",
  "detail": {
    "assistant": "Assistente",
    "contact": "Contato associado",
    "location": "Local",
    "description": "Descrição",
    "meetLink": "Abrir no Google Meet",
    "noDescription": "Sem descrição"
  },
  "legend": {
    "title": "Assistentes"
  }
}
```

**en** e **es** equivalentes.

---

## Dependências

- `@fullcalendar/react` + `@fullcalendar/daygrid` — componente de calendário
- `@fullcalendar/core` — base
- Sheet do `@/components/ui/sheet` — já existente
- `@/lib/formatting` — `formatDateTime()`, `formatDate()` — já existente

---

## Checklist de Conformidade

- [x] Módulo expõe apenas o service
- [x] Endpoint coberto pelo TenantGuard
- [x] findMany filtra por tenantId
- [x] Resposta segue envelope padrão `{ data, meta }`
- [x] DTOs validados com Zod (query params de range)
- [x] Variáveis de ambiente: nenhuma nova
- [x] Migration: adicionar `assistantId` ao `CalendarEvent` (opcional, nullable)
- [x] i18n: namespace `calendar` nos 3 arquivos
- [x] Nenhuma string hardcoded no frontend
