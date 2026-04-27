# Calendar Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página de calendário mensal que exibe eventos criados por assistentes de IA no Google Calendar, com filtro por assistente e detalhes em Sheet lateral.

**Architecture:** FullCalendar para grid mensal no frontend. Backend adiciona campo `assistantId` ao `CalendarEvent`, corrige o tool `CRIAR_EVENTO` para salvar localmente, e cria endpoint `GET /calendar-events` com filtro por range de datas.

**Tech Stack:** NestJS (backend), Next.js + FullCalendar (frontend), Prisma (ORM), Zod (validação), BullMQ (filas), next-intl (i18n)

---

## File Structure

### New Files
- `packages/database/prisma/migrations/YYYYMMDD_add_assistant_id_to_calendar_event/migration.sql` — migration para `assistantId`
- `apps/api/src/modules/integrations/dto/list-calendar-events.dto.ts` — DTO de query params
- `apps/web/src/app/(dashboard)/calendar/page.tsx` — página principal
- `apps/web/src/components/calendar/calendar-view.tsx` — wrapper FullCalendar
- `apps/web/src/components/calendar/calendar-toolbar.tsx` — toolbar com navegação + filtro
- `apps/web/src/components/calendar/calendar-event-card.tsx` — conteúdo custom do evento
- `apps/web/src/components/calendar/calendar-event-detail.tsx` — Sheet de detalhes
- `apps/web/src/components/calendar/calendar-legend.tsx` — legenda de cores
- `apps/web/src/hooks/use-calendar-events.ts` — hook de fetch
- `apps/web/src/lib/assistant-colors.ts` — mapa de cores por assistente

### Modified Files
- `packages/database/prisma/schema.prisma` — adicionar `assistantId` ao `CalendarEvent`
- `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts` — `ToolContext` + `executeCriarEvento`
- `apps/api/src/modules/assistants/queues/ai-response.processor.ts` — passar `assistantId` no `ToolContext`
- `apps/api/src/modules/integrations/integrations.controller.ts` — novo endpoint `GET /calendar-events`
- `apps/api/src/modules/integrations/integrations.service.ts` — método `findCalendarEvents`
- `apps/api/src/modules/integrations/integrations.repository.ts` — query com range
- `apps/web/src/components/layout/sidebar.tsx` — item "Calendário" no menu
- `apps/web/messages/pt-BR.json` — namespace `calendar` + item nav
- `apps/web/messages/en.json` — namespace `calendar` + item nav
- `apps/web/messages/es.json` — namespace `calendar` + item nav

---

## Task 1: Migration — Adicionar `assistantId` ao `CalendarEvent`

**Files:**
- Modify: `packages/database/prisma/schema.prisma` (modelo CalendarEvent, ~linha 880)

- [ ] **Step 1: Adicionar campo `assistantId` ao modelo CalendarEvent**

No arquivo `packages/database/prisma/schema.prisma`, no modelo `CalendarEvent`, adicionar após a linha `status`:

```prisma
  assistantId  String?
  assistant    Assistant? @relation(fields: [assistantId], references: [id])
```

Também adicionar ao modelo `Assistant` (por volta da linha 725, após `instanceDefaults`):

```prisma
  calendarEvents CalendarEvent[]
```

Adicionar índice no CalendarEvent (junto aos outros `@@index`):

```prisma
  @@index([assistantId])
```

- [ ] **Step 2: Gerar e rodar a migration**

```bash
cd /home/ixcsoft/Documentos/whatsapp-tools
npx prisma migrate dev --name add_assistant_id_to_calendar_event --schema packages/database/prisma/schema.prisma
```

- [ ] **Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add assistantId to CalendarEvent model"
```

---

## Task 2: Backend — Adicionar `assistantId` ao `ToolContext` e corrigir `executeCriarEvento`

**Files:**
- Modify: `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts`
- Modify: `apps/api/src/modules/assistants/queues/ai-response.processor.ts`

- [ ] **Step 1: Adicionar `assistantId` à interface `ToolContext`**

No arquivo `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts`, modificar a interface `ToolContext`:

```typescript
export interface ToolContext {
  tenantId: string
  conversationId: string
  contactId: string
  contactPhone: string
  contactName?: string
  assistantId?: string
}
```

- [ ] **Step 2: Passar `assistantId` na construção do `ToolContext`**

No arquivo `apps/api/src/modules/assistants/queues/ai-response.processor.ts`, por volta da linha 188-194, adicionar `assistantId` ao objeto `toolContext`:

```typescript
const toolContext: ToolContext = {
  tenantId,
  conversationId,
  contactId: conversation.contactId,
  contactPhone: conversation.contact.phone,
  contactName: conversation.contact.name ?? undefined,
  assistantId: effectiveAssistantId,
}
```

- [ ] **Step 3: Corrigir `executeCriarEvento` para salvar no banco local**

No arquivo `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts`, modificar o método `executeCriarEvento`. Após o bloco `const result = await this.calendarProvider.createEvent(...)`, adicionar salvamento no banco:

```typescript
private async executeCriarEvento(tool: AiTool, context: ToolContext): Promise<ToolResult> {
  const config = tool.config as {
    integrationId: string
    defaultDurationMinutes: number
    defaultLocation?: string
    timezone: string
    createMeetLink: boolean
  }

  try {
    const accessToken = await this.integrationsService.getDecryptedAccessToken(
      context.tenantId,
      config.integrationId,
    )

    const startAt = new Date()
    const endAt = new Date(startAt.getTime() + config.defaultDurationMinutes * 60_000)

    const result = await this.calendarProvider.createEvent(accessToken, {
      title: `Reunião - ${context.contactName ?? context.contactPhone}`,
      description: `Agendado via WhatsApp por ${context.contactName ?? context.contactPhone}`,
      startAt,
      endAt,
      timezone: config.timezone,
      location: config.defaultLocation,
      createMeetLink: config.createMeetLink,
    })

    await this.integrationsRepository.createCalendarEvent({
      tenantId: context.tenantId,
      integrationId: config.integrationId,
      externalEventId: result.eventId,
      title: `Reunião - ${context.contactName ?? context.contactPhone}`,
      description: `Agendado via WhatsApp por ${context.contactName ?? context.contactPhone}`,
      startAt,
      endAt,
      timezone: config.timezone,
      location: config.defaultLocation,
      hangoutLink: result.hangoutLink,
      status: 'confirmed',
      assistantId: context.assistantId,
    })

    return {
      success: true,
      output: `Evento criado!\nLink: ${result.htmlLink}${result.hangoutLink ? `\nMeet: ${result.hangoutLink}` : ''}`,
      data: { eventId: result.eventId, htmlLink: result.htmlLink, hangoutLink: result.hangoutLink },
    }
  } catch (error) {
    return {
      success: false,
      output: `Erro ao criar evento: ${(error as Error).message}`,
    }
  }
}
```

**Nota:** Verificar se `this.integrationsRepository` já está injetado no `ToolExecutorService`. Se não, adicionar no construtor. Verificar também se o parâmetro `assistantId` é aceito pelo `createCalendarEvent` do repository — se não, adicionar.

- [ ] **Step 4: Atualizar o repository para aceitar `assistantId`**

No arquivo `apps/api/src/modules/integrations/integrations.repository.ts`, atualizar o método `createCalendarEvent` para aceitar `assistantId`:

```typescript
async createCalendarEvent(data: {
  tenantId: string
  integrationId: string
  externalEventId: string
  title: string
  description?: string
  startAt: Date
  endAt: Date
  timezone: string
  location?: string
  attendees?: any
  hangoutLink?: string
  status: string
  assistantId?: string
}) {
  return this.prisma.calendarEvent.create({ data })
}
```

- [ ] **Step 5: Verificar injeção do repository no ToolExecutorService**

No arquivo `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts`, verificar se `IntegrationsRepository` está injetado no construtor. Se não estiver, adicionar:

```typescript
constructor(
  // ... dependências existentes
  private readonly integrationsRepository: IntegrationsRepository,
) {}
```

E garantir que o `AiToolsModule` importa `IntegrationsModule` (ou fornece o repository).

- [ ] **Step 6: Rodar testes existentes**

```bash
cd /home/ixcsoft/Documentos/whatsapp-tools
pnpm --filter @repo/api test
```

Expected: Todos passam. Se algum teste quebrar por causa do novo campo no `ToolContext`, corrigir o mock.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts apps/api/src/modules/assistants/queues/ai-response.processor.ts apps/api/src/modules/integrations/integrations.repository.ts
git commit -m "feat(ai-tools): save calendar events locally with assistantId"
```

---

## Task 3: Backend — Criar endpoint `GET /calendar-events`

**Files:**
- Create: `apps/api/src/modules/integrations/dto/list-calendar-events.dto.ts`
- Modify: `apps/api/src/modules/integrations/integrations.controller.ts`
- Modify: `apps/api/src/modules/integrations/integrations.service.ts`
- Modify: `apps/api/src/modules/integrations/integrations.repository.ts`

- [ ] **Step 1: Criar DTO de validação**

Criar arquivo `apps/api/src/modules/integrations/dto/list-calendar-events.dto.ts`:

```typescript
import { z } from 'zod'

export const listCalendarEventsSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  assistantId: z.string().optional(),
})

export type ListCalendarEventsDto = z.infer<typeof listCalendarEventsSchema>
```

- [ ] **Step 2: Adicionar método `findCalendarEvents` no repository**

No arquivo `apps/api/src/modules/integrations/integrations.repository.ts`, adicionar:

```typescript
async findCalendarEvents(
  tenantId: string,
  start: Date,
  end: Date,
  assistantId?: string,
) {
  return this.prisma.calendarEvent.findMany({
    where: {
      tenantId,
      startAt: { gte: start, lte: end },
      ...(assistantId ? { assistantId } : {}),
    },
    include: {
      assistant: {
        select: { id: true, name: true, avatarEmoji: true },
      },
    },
    orderBy: { startAt: 'asc' },
  })
}
```

- [ ] **Step 3: Adicionar método `findCalendarEvents` no service**

No arquivo `apps/api/src/modules/integrations/integrations.service.ts`, adicionar:

```typescript
async findCalendarEvents(
  tenantId: string,
  start: string,
  end: string,
  assistantId?: string,
) {
  const events = await this.repository.findCalendarEvents(
    tenantId,
    new Date(start),
    new Date(end),
    assistantId,
  )
  return {
    data: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      timezone: e.timezone,
      location: e.location,
      hangoutLink: e.hangoutLink,
      status: e.status,
      attendees: e.attendees,
      assistant: e.assistant,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}
```

- [ ] **Step 4: Adicionar endpoint no controller**

No arquivo `apps/api/src/modules/integrations/integrations.controller.ts`, adicionar import do DTO e novo endpoint. O endpoint deve ficar **antes** do `@Get(':id')` para não conflitar:

```typescript
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { listCalendarEventsSchema } from './dto/list-calendar-events.dto'

// ... no corpo da classe, ANTES do @Get(':id'):

@Get('calendar-events')
findCalendarEvents(
  @CurrentTenant() tenantId: string,
  @Query(new ZodValidationPipe(listCalendarEventsSchema))
  query: { start: string; end: string; assistantId?: string },
) {
  return this.integrationsService.findCalendarEvents(
    tenantId,
    query.start,
    query.end,
    query.assistantId,
  )
}
```

Verificar se `ZodValidationPipe` existe em `@shared/pipes/`. Se não existir, verificar o padrão de validação usado em outros controllers do projeto e seguir o mesmo padrão.

- [ ] **Step 5: Testar endpoint manualmente (com banco rodando)**

```bash
# Com o servidor rodando
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4000/integrations/calendar-events?start=2026-04-01&end=2026-04-30"
```

Expected: `{ "data": [] }` (ou lista de eventos se houver dados).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/integrations/
git commit -m "feat(integrations): add GET /calendar-events endpoint with date range filter"
```

---

## Task 4: Frontend — Instalar FullCalendar

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Instalar dependências**

```bash
cd /home/ixcsoft/Documentos/whatsapp-tools
pnpm --filter @repo/web add @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "chore(web): add @fullcalendar dependencies"
```

---

## Task 5: Frontend — i18n e menu lateral

**Files:**
- Modify: `apps/web/messages/pt-BR.json`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/es.json`
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Adicionar namespace `calendar` ao pt-BR.json**

No arquivo `apps/web/messages/pt-BR.json`, adicionar o namespace `calendar` e o item de navegação:

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

No namespace `nav.items`, adicionar:

```json
"calendar": "Calendário"
```

- [ ] **Step 2: Adicionar namespace `calendar` ao en.json**

```json
"calendar": {
  "title": "Calendar",
  "today": "Today",
  "noEvents": "No events in this period",
  "filterPlaceholder": "All assistants",
  "detail": {
    "assistant": "Assistant",
    "contact": "Associated contact",
    "location": "Location",
    "description": "Description",
    "meetLink": "Open in Google Meet",
    "noDescription": "No description"
  },
  "legend": {
    "title": "Assistants"
  }
}
```

No namespace `nav.items`:

```json
"calendar": "Calendar"
```

- [ ] **Step 3: Adicionar namespace `calendar` ao es.json**

```json
"calendar": {
  "title": "Calendario",
  "today": "Hoy",
  "noEvents": "Sin eventos en este período",
  "filterPlaceholder": "Todos los asistentes",
  "detail": {
    "assistant": "Asistente",
    "contact": "Contacto asociado",
    "location": "Ubicación",
    "description": "Descripción",
    "meetLink": "Abrir en Google Meet",
    "noDescription": "Sin descripción"
  },
  "legend": {
    "title": "Asistentes"
  }
}
```

No namespace `nav.items`:

```json
"calendar": "Calendario"
```

- [ ] **Step 4: Adicionar item ao menu lateral**

No arquivo `apps/web/src/components/layout/sidebar.tsx`:

1. Importar ícone `CalendarDays` do lucide-react (junto com os outros imports de ícones):
```typescript
import { ..., CalendarDays } from 'lucide-react'
```

2. No array de items do grupo `service`, adicionar após CRM:
```typescript
{ icon: CalendarDays, label: tNav('items.calendar'), href: '/calendar' },
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/messages/ apps/web/src/components/layout/sidebar.tsx
git commit -m "feat(i18n): add calendar namespace translations and sidebar nav item"
```

---

## Task 6: Frontend — Lib de cores e hook de dados

**Files:**
- Create: `apps/web/src/lib/assistant-colors.ts`
- Create: `apps/web/src/hooks/use-calendar-events.ts`

- [ ] **Step 1: Criar mapa de cores por assistente**

Criar arquivo `apps/web/src/lib/assistant-colors.ts`:

```typescript
const COLOR_POOL = [
  { bg: '#dcfce9', border: '#008b46', text: '#005e30' },
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#f3e8ff', border: '#8b5cf6', text: '#6d28d9' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#cffafe', border: '#06b6d4', text: '#155e75' },
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
]

const assistantColorMap = new Map<string, number>()

export function getAssistantColor(assistantId: string | null | undefined) {
  if (!assistantId) return COLOR_POOL[0]

  if (!assistantColorMap.has(assistantId)) {
    assistantColorMap.set(assistantId, assistantColorMap.size % COLOR_POOL.length)
  }

  return COLOR_POOL[assistantColorMap.get(assistantId)!]
}
```

- [ ] **Step 2: Criar hook `use-calendar-events`**

Criar arquivo `apps/web/src/hooks/use-calendar-events.ts`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api-client'

export interface CalendarEventAssistant {
  id: string
  name: string
  avatarEmoji: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string
  timezone: string
  location: string | null
  hangoutLink: string | null
  status: string
  attendees: unknown
  assistant: CalendarEventAssistant | null
  createdAt: string
}

export function useCalendarEvents() {
  const t = useTranslations('calendar')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(
    async (start: string, end: string, assistantId?: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ start, end })
        if (assistantId) params.set('assistantId', assistantId)

        const res = await apiGet<{ data: CalendarEvent[] }>(
          `integrations/calendar-events?${params}`,
        )
        setEvents(res.data)
      } catch {
        toast.error(t('noEvents'))
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  return { events, loading, fetchEvents }
}
```

**Nota:** Verificar como `apiGet` é importado em outros hooks do projeto (pode ser de `@/lib/api-client` ou similar). Ajustar o import conforme o padrão existente.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/assistant-colors.ts apps/web/src/hooks/use-calendar-events.ts
git commit -m "feat(calendar): add assistant color map and calendar events hook"
```

---

## Task 7: Frontend — Componentes do calendário

**Files:**
- Create: `apps/web/src/components/calendar/calendar-legend.tsx`
- Create: `apps/web/src/components/calendar/calendar-event-card.tsx`
- Create: `apps/web/src/components/calendar/calendar-event-detail.tsx`
- Create: `apps/web/src/components/calendar/calendar-toolbar.tsx`
- Create: `apps/web/src/components/calendar/calendar-view.tsx`

- [ ] **Step 1: Criar `calendar-legend.tsx`**

Criar arquivo `apps/web/src/components/calendar/calendar-legend.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { CalendarEventAssistant } from '@/hooks/use-calendar-events'
import { getAssistantColor } from '@/lib/assistant-colors'

interface CalendarLegendProps {
  assistants: CalendarEventAssistant[]
}

export function CalendarLegend({ assistants }: CalendarLegendProps) {
  const t = useTranslations('calendar')

  const uniqueAssistants = assistants.filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  )

  if (uniqueAssistants.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-4 border-t px-5 py-3 text-xs text-muted-foreground">
      {uniqueAssistants.map((assistant) => {
        const color = getAssistantColor(assistant.id)
        return (
          <div key={assistant.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: color.border }}
            />
            {assistant.avatarEmoji} {assistant.name}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Criar `calendar-event-card.tsx`**

Criar arquivo `apps/web/src/components/calendar/calendar-event-card.tsx`:

```tsx
'use client'

import { getAssistantColor } from '@/lib/assistant-colors'
import type { CalendarEvent } from '@/hooks/use-calendar-events'

interface CalendarEventCardProps {
  event: CalendarEvent
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const color = getAssistantColor(event.assistant?.id)

  return (
    <div
      className="cursor-pointer truncate rounded-sm px-1.5 py-0.5 text-[11px] leading-tight"
      style={{
        backgroundColor: color.bg,
        borderLeft: `3px solid ${color.border}`,
        color: color.text,
      }}
    >
      {event.assistant?.avatarEmoji && (
        <span className="mr-0.5">{event.assistant.avatarEmoji}</span>
      )}
      {event.title}
    </div>
  )
}
```

- [ ] **Step 3: Criar `calendar-event-detail.tsx`**

Criar arquivo `apps/web/src/components/calendar/calendar-event-detail.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/formatting'
import type { CalendarEvent } from '@/hooks/use-calendar-events'
import { getAssistantColor } from '@/lib/assistant-colors'

interface CalendarEventDetailProps {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
}

export function CalendarEventDetail({
  event,
  open,
  onClose,
}: CalendarEventDetailProps) {
  const t = useTranslations('calendar')

  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{event.title}</SheetTitle>
          <SheetDescription>
            {formatDateTime(event.startAt)} — {formatDateTime(event.endAt).split(' ').pop()}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">📍</span>
              <span>{event.location}</span>
            </div>
          )}

          {event.assistant && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">🤖</span>
              <div>
                <div className="font-medium">{event.assistant.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t('detail.assistant')}
                </div>
              </div>
            </div>
          )}

          {event.hangoutLink && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">🔗</span>
              <a
                href={event.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {t('detail.meetLink')}
              </a>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              {t('detail.description')}
            </div>
            <div className="text-sm leading-relaxed">
              {event.description || t('detail.noDescription')}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Criar `calendar-toolbar.tsx`**

Verificar como o projeto lista assistentes — buscar um hook ou API que retorna os assistentes do tenant. Usar esse padrão para o filtro.

Criar arquivo `apps/web/src/components/calendar/calendar-toolbar.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEventAssistant } from '@/hooks/use-calendar-events'

interface CalendarToolbarProps {
  title: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  assistants: CalendarEventAssistant[]
  selectedAssistantId: string | null
  onAssistantChange: (id: string | null) => void
}

export function CalendarToolbar({
  title,
  onPrev,
  onNext,
  onToday,
  assistants,
  selectedAssistantId,
  onAssistantChange,
}: CalendarToolbarProps) {
  const t = useTranslations('calendar')

  const uniqueAssistants = assistants.filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  )

  return (
    <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onToday}>
          {t('today')}
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[160px] text-center text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {uniqueAssistants.length > 1 && (
        <Select
          value={selectedAssistantId ?? 'all'}
          onValueChange={(v) => onAssistantChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filterPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterPlaceholder')}</SelectItem>
            {uniqueAssistants.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.avatarEmoji} {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Criar `calendar-view.tsx`**

Criar arquivo `apps/web/src/components/calendar/calendar-view.tsx`:

```tsx
'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core'
import { CalendarToolbar } from './calendar-toolbar'
import { CalendarEventCard } from './calendar-event-card'
import { CalendarEventDetail } from './calendar-event-detail'
import { CalendarLegend } from './calendar-legend'
import { useCalendarEvents, type CalendarEvent } from '@/hooks/use-calendar-events'

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null)
  const { events, loading, fetchEvents } = useCalendarEvents()

  const fetchForRange = useCallback(
    (start: Date, end: Date) => {
      fetchEvents(start.toISOString(), end.toISOString())
    },
    [fetchEvents],
  )

  const handleDates = useCallback(
    (selectInfo: { start: Date; end: Date; startStr: string; endStr: string }) => {
      setTitle(
        calendarRef.current?.getApi().view.title ?? '',
      )
      fetchForRange(selectInfo.start, selectInfo.end)
    },
    [fetchForRange],
  )

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event.extendedProps.rawEvent as CalendarEvent
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const filteredEvents = useMemo(() => {
    if (!selectedAssistantId) return events
    return events.filter((e) => e.assistant?.id === selectedAssistantId)
  }, [events, selectedAssistantId])

  const calendarEvents: EventInput[] = useMemo(
    () =>
      filteredEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.startAt,
        end: e.endAt,
        extendedProps: { rawEvent: e },
      })),
    [filteredEvents],
  )

  const assistants = useMemo(
    () =>
      events
        .map((e) => e.assistant)
        .filter((a): a is NonNullable<typeof a> => a !== null),
    [events],
  )

  return (
    <div className="rounded-lg border bg-card">
      <CalendarToolbar
        title={title}
        onPrev={() => calendarRef.current?.getApi().prev()}
        onNext={() => calendarRef.current?.getApi().next()}
        onToday={() => calendarRef.current?.getApi().today()}
        assistants={assistants}
        selectedAssistantId={selectedAssistantId}
        onAssistantChange={setSelectedAssistantId}
      />

      <div className="p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale="pt-br"
          headerToolbar={false}
          events={calendarEvents}
          datesSet={handleDates}
          eventClick={handleEventClick}
          eventContent={(arg) => (
            <CalendarEventCard event={arg.event.extendedProps.rawEvent} />
          )}
          height="auto"
          dayMaxEvents={3}
          firstDay={0}
          fixedWeekCount={false}
          loading={(isLoading) => console.log('calendar loading:', isLoading)}
        />
      </div>

      <CalendarLegend assistants={assistants} />

      <CalendarEventDetail
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/calendar/
git commit -m "feat(calendar): add calendar UI components (view, toolbar, detail, legend)"
```

---

## Task 8: Frontend — Página principal

**Files:**
- Create: `apps/web/src/app/(dashboard)/calendar/page.tsx`

- [ ] **Step 1: Criar página do calendário**

Criar arquivo `apps/web/src/app/(dashboard)/calendar/page.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { PageLayout } from '@/components/layout/page-layout'
import { CalendarView } from '@/components/calendar/calendar-view'

export default function CalendarPage() {
  const t = useTranslations('calendar')

  return (
    <PageLayout title={t('title')}>
      <CalendarView />
    </PageLayout>
  )
}
```

**Nota:** Verificar como `PageLayout` é usado em outras páginas (ex: broadcasts/page.tsx) e ajustar se necessário. Algumas páginas usam mais props como `description` ou `actions`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/calendar/
git commit -m "feat(calendar): add calendar page route"
```

---

## Task 9: Integração e teste visual

**Files:** None new

- [ ] **Step 1: Rodar o app frontend**

```bash
cd /home/ixcsoft/Documentos/whatsapp-tools
pnpm --filter @repo/web dev
```

- [ ] **Step 2: Navegar até /calendar e verificar**

1. A página renderiza com o grid mensal do FullCalendar
2. O título do mês aparece corretamente
3. Navegação (◀ ▶ Hoje) funciona
4. Sidebar mostra item "Calendário" no menu
5. Legenda aparece (se houver eventos)
6. Sem erros no console

- [ ] **Step 3: Verificar responsividade**

Testar em viewport mobile (375px) — o grid deve se adaptar sem quebrar.

- [ ] **Step 4: Commit final se houver ajustes**

```bash
git add -A
git commit -m "fix(calendar): visual adjustments after integration testing"
```
