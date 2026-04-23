# Inactivity Flow — Mover para Assistant + UI no Frontend

## Objetivo

Mover o campo `inactivityFlowRules` do modelo `Instance` para o modelo `Assistant`, e criar a interface de configuracao no formulario do assistente como uma nova aba "Inatividade".

## Motivacao

O fluxo de inatividade define o comportamento do assistente quando o cliente para de responder. Faz mais sentido que essa configuracao esteja no assistente (que define o comportamento) e nao na instancia (que e o canal WhatsApp).

---

## Mudancas no Backend

### 1. Prisma Schema

**Remover de `Instance`:**
```prisma
# REMOVER esta linha do model Instance:
inactivityFlowRules Json @default("[]")
```

**Adicionar em `Assistant`:**
```prisma
model Assistant {
  # ... campos existentes
  inactivityFlowRules Json @default("[]")
  # ...
}
```

### 2. Migration

Criar migration que:
- Adiciona `inactivityFlowRules` no modelo `Assistant`
- Copia dados existentes de `Instance.inactivityFlowRules` para `Assistant.inactivityFlowRules` (via SQL, relacionando pelo `defaultAssistantId`)
- Remove `inactivityFlowRules` do modelo `Instance`

### 3. Inactivity Scanner Processor

**Antes:** Busca `instance.inactivityFlowRules`
**Depois:** Busca `instance.defaultAssistant.inactivityFlowRules`

```typescript
const instances = await this.prisma.instance.findMany({
  where: { status: 'CONNECTED', defaultAssistantId: { not: null } },
  select: {
    id: true,
    evolutionId: true,
    tenantId: true,
    defaultAssistant: {
      select: { inactivityFlowRules: true },
    },
  },
})

// Regras vem do assistente
const rules = instance.defaultAssistant.inactivityFlowRules as InactivityRule[]
```

Pular instancias sem assistente padrao ou sem regras.

### 4. DTOs

**`create-assistant.dto.ts`** — adicionar campo:
```typescript
inactivityFlowRules: z.array(
  z.object({
    timeInSeconds: z.coerce.number(),
    actionType: z.enum(['interact', 'close']),
    message: z.string().max(512).optional(),
    allowExecutionAnyTime: z.boolean().default(true),
  })
).default([]),
```

**`update-instance.dto.ts`** — remover campo `inactivityFlowRules`.

### 5. Services

- `assistants.service.ts`: incluir `inactivityFlowRules` no create/update/find
- `instances.service.ts`: remover logica de `inactivityFlowRules`

### 6. Testes

- Atualizar mocks de `instances.service.spec.ts` (remover `inactivityFlowRules`)
- Atualizar mocks de `inbox.service.spec.ts` se necessario
- Atualizar `groups.service.spec.ts` se necessario

---

## Mudancas no Frontend

### 1. Types (`types.ts`)

```typescript
export interface InactivityRule {
  timeInSeconds: number
  actionType: 'interact' | 'close'
  message?: string
  allowExecutionAnyTime: boolean
}

export interface Assistant {
  // ... campos existentes
  inactivityFlowRules: InactivityRule[]
}
```

### 2. AssistantFormData

```typescript
export interface AssistantFormData {
  // ... campos existentes
  inactivityFlowRules: InactivityRule[]
}
```

### 3. Nova aba no `assistant-form.tsx`

Adicionar terceira aba "Inatividade" com:
- Descricao explicando o recurso
- Lista ordenada de regras (etapas)
- Cada regra com:
  - Tempo em minutos (input number, converte para segundos ao salvar)
  - Tipo de acao: "Enviar mensagem" | "Fechar conversa"
  - Mensagem (textarea, visivel apenas quando actionType = 'interact')
  - Checkbox "Executar apenas em horario comercial (8h-18h, seg-sex)"
- Botao "+ Adicionar etapa"
- Botao de lixeira para remover cada etapa
- Botao de seta para reordenar (cima/baixo)

### 4. i18n — Traducoes

Adicionar namespace `assistants.inactivity` nos 3 arquivos JSON:

**pt-BR:**
```json
"inactivity": {
  "tab": "Inatividade",
  "title": "Regras de Inatividade",
  "description": "Configure acoes automaticas quando o cliente para de responder.",
  "addStep": "Adicionar etapa",
  "removeStep": "Remover etapa",
  "after": "Apos",
  "minutes": "minutos",
  "action": "Acao",
  "actionInteract": "Enviar mensagem",
  "actionClose": "Fechar conversa",
  "message": "Mensagem",
  "messagePlaceholder": "Digite a mensagem que sera enviada...",
  "businessHours": "Executar apenas em horario comercial (8h-18h, seg-sex)",
  "empty": "Nenhuma regra configurada",
  "emptyHint": "Adicione etapas para automatizar o acompanhamento de conversas inativas.",
  "step": "Etapa {number}"
}
```

**en** e **es** com traducoes equivalentes.

---

## Ordem de Implementacao

1. Migration (schema + copia de dados)
2. Backend: DTOs + service + scanner
3. Frontend: types + form + i18n
4. Testes: atualizar mocks
