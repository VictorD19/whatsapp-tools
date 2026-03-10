# RULE: Internacionalização (i18n) — Todo texto visível ao usuário DEVE ser traduzido

## Princípio

**Nunca hardcodar strings visíveis ao usuário.** Todo texto que aparece na interface —
títulos, labels, placeholders, botões, toasts, mensagens de erro, estados vazios —
deve usar o sistema de tradução `next-intl`.

Os idiomas suportados são: **pt-BR**, **en**, **es** (todos devem ser atualizados juntos).

---

## Localização dos arquivos

```
apps/web/messages/
├── pt-BR.json   ← padrão (referência)
├── en.json
└── es.json
```

---

## Namespaces existentes (não duplicar)

| Namespace     | Uso                                              |
|---------------|--------------------------------------------------|
| `common`      | Ações genéricas: Salvar, Cancelar, Excluir, etc. |
| `auth`        | Login, registro, branding da auth page           |
| `nav`         | Itens e grupos do menu lateral                   |
| `inbox`       | Conversas, mensagens, atendimento                |
| `crm`         | Negócios, pipeline, Kanban                       |
| `instances`   | Instâncias WhatsApp                              |
| `contacts`    | Contatos                                         |
| `settings`    | Configurações e preferências                     |
| `admin`       | Painel administrativo                            |
| `validation`  | Mensagens de validação de formulários            |
| `status`      | Estados de recursos (connected, open, sent...)   |

Para módulos novos (broadcasts, assistants, groups, contactLists, knowledgeBases, aiTools),
criar um namespace dedicado nos 3 arquivos JSON.

---

## Como usar em componentes React

```tsx
// ✅ CORRETO
import { useTranslations } from 'next-intl'

export function MeuComponente() {
  const t = useTranslations('meuModulo')

  return (
    <>
      <h1>{t('title')}</h1>
      <Button>{t('create')}</Button>
      <p>{t('empty')}</p>
    </>
  )
}
```

```tsx
// ✅ CORRETO — namespace common para ações genéricas
const tCommon = useTranslations('common')

<Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
<Button onClick={onSubmit}>{tCommon('save')}</Button>
```

```tsx
// ✅ CORRETO — múltiplos namespaces no mesmo componente
const t = useTranslations('broadcasts')
const tCommon = useTranslations('common')

<SheetTitle>{isEditing ? t('edit') : t('new')}</SheetTitle>
<Button>{isEditing ? tCommon('saveChanges') : t('create')}</Button>
```

---

## Como usar em hooks (toast messages)

Hooks React também podem usar `useTranslations`:

```tsx
// ✅ CORRETO
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

export function useMeuModulo() {
  const t = useTranslations('meuModulo')

  const criar = async (data: CreateDto) => {
    try {
      await api.post('/meu-modulo', data)
      toast.success(t('success.created'))
    } catch {
      toast.error(t('error.creating'))
    }
  }

  return { criar }
}
```

---

## Como adicionar novas chaves

**Regra obrigatória: toda chave nova deve ser adicionada nos 3 arquivos ao mesmo tempo.**

### Exemplo — novo módulo `broadcasts`

**`pt-BR.json`:**
```json
"broadcasts": {
  "title": "Disparos em Massa",
  "new": "Nova campanha",
  "edit": "Editar campanha",
  "empty": "Nenhuma campanha encontrada",
  "steps": {
    "recipients": "Destinatários",
    "message": "Mensagem",
    "settings": "Configurações"
  },
  "success": {
    "created": "Campanha criada com sucesso",
    "updated": "Campanha atualizada com sucesso",
    "deleted": "Campanha removida"
  },
  "error": {
    "loading": "Erro ao carregar campanhas",
    "creating": "Erro ao criar campanha"
  }
}
```

**`en.json`:**
```json
"broadcasts": {
  "title": "Mass Broadcasts",
  "new": "New campaign",
  "edit": "Edit campaign",
  "empty": "No campaigns found",
  "steps": {
    "recipients": "Recipients",
    "message": "Message",
    "settings": "Settings"
  },
  "success": {
    "created": "Campaign created successfully",
    "updated": "Campaign updated successfully",
    "deleted": "Campaign removed"
  },
  "error": {
    "loading": "Error loading campaigns",
    "creating": "Error creating campaign"
  }
}
```

**`es.json`:**
```json
"broadcasts": {
  "title": "Envíos Masivos",
  "new": "Nueva campaña",
  "edit": "Editar campaña",
  "empty": "No se encontraron campañas",
  "steps": {
    "recipients": "Destinatarios",
    "message": "Mensaje",
    "settings": "Configuración"
  },
  "success": {
    "created": "Campaña creada exitosamente",
    "updated": "Campaña actualizada exitosamente",
    "deleted": "Campaña eliminada"
  },
  "error": {
    "loading": "Error al cargar campañas",
    "creating": "Error al crear campaña"
  }
}
```

---

## Estrutura recomendada de chaves por módulo

```json
"nomeDoModulo": {
  "title": "...",
  "subtitle": "...",
  "new": "...",
  "edit": "...",
  "empty": "...",
  "emptyHint": "...",
  "searchPlaceholder": "...",
  "success": {
    "created": "...",
    "updated": "...",
    "deleted": "..."
  },
  "error": {
    "loading": "...",
    "creating": "...",
    "updating": "...",
    "deleting": "..."
  },
  "confirm": {
    "delete": "...",
    "deleteDescription": "..."
  }
}
```

---

## Chaves do `common` disponíveis (reutilizar antes de criar)

| Chave              | pt-BR              | en              | es              |
|--------------------|--------------------|-----------------|-----------------|
| `common.save`      | Salvar             | Save            | Guardar         |
| `common.cancel`    | Cancelar           | Cancel          | Cancelar        |
| `common.delete`    | Excluir            | Delete          | Eliminar        |
| `common.edit`      | Editar             | Edit            | Editar          |
| `common.create`    | Criar              | Create          | Crear           |
| `common.search`    | Buscar             | Search          | Buscar          |
| `common.loading`   | Carregando...      | Loading...      | Cargando...     |
| `common.confirm`   | Confirmar          | Confirm         | Confirmar       |
| `common.back`      | Voltar             | Back            | Volver          |
| `common.next`      | Próximo            | Next            | Siguiente       |
| `common.close`     | Fechar             | Close           | Cerrar          |
| `common.saveChanges` | Salvar alterações | Save changes   | Guardar cambios |
| `common.noResults` | Nenhum resultado encontrado | No results found | No se encontraron resultados |

---

## Anti-padrões proibidos

```tsx
// ❌ ERRADO — string hardcoded em pt-BR
<h1>Nova campanha</h1>
<Button>Cancelar</Button>
toast.success("Campanha criada com sucesso")
toast.error("Erro ao carregar campanhas")

// ❌ ERRADO — placeholder hardcoded
<Input placeholder="Buscar por nome ou telefone..." />

// ❌ ERRADO — estado vazio hardcoded
<p>Nenhuma conversa aqui</p>
<span>As conversas aparecerão aqui quando chegarem</span>

// ❌ ERRADO — estados de loading/saving hardcoded
<Button>{saving ? 'Salvando...' : 'Salvar'}</Button>
<Button>{loading ? 'Excluindo...' : 'Excluir'}</Button>
```

```tsx
// ✅ CORRETO
const t = useTranslations('broadcasts')
const tCommon = useTranslations('common')

<h1>{t('new')}</h1>
<Button variant="outline">{tCommon('cancel')}</Button>
toast.success(t('success.created'))
toast.error(t('error.loading'))

<Input placeholder={t('searchPlaceholder')} />

<p>{t('empty')}</p>
<span>{t('emptyHint')}</span>

<Button>{saving ? t('saving') : tCommon('save')}</Button>
<Button>{loading ? t('deleting') : tCommon('delete')}</Button>
```

---

## Checklist obrigatório ao criar qualquer fluxo frontend novo

- [ ] Nenhuma string visível ao usuário está hardcoded no componente
- [ ] Nenhum toast usa string literal — todas passam por `t()`
- [ ] Namespace do módulo criado nos 3 arquivos JSON (`pt-BR.json`, `en.json`, `es.json`)
- [ ] Chaves do `common` foram aproveitadas antes de criar chaves redundantes
- [ ] Placeholders de inputs usam `t('searchPlaceholder')` ou equivalente
- [ ] Estados de vazio (`empty`, `emptyHint`) traduzidos
- [ ] Estados de ação (`saving`, `creating`, `deleting`) traduzidos
- [ ] Mensagens de sucesso e erro dos toasts traduzidas

---

## Situações especiais

### Texto com variável interpolada

```json
// pt-BR.json
"totalContacts": "{count} contatos"
```
```tsx
// componente
t('totalContacts', { count: 42 }) // → "42 contatos"
```

### Texto condicional (criar vs editar)

Preferir chaves separadas ao invés de lógica no JSON:

```json
"new": "Nova campanha",
"edit": "Editar campanha"
```
```tsx
<SheetTitle>{isEditing ? t('edit') : t('new')}</SheetTitle>
```

### Confirmação de exclusão

Sempre usar o namespace do módulo para a mensagem específica, mas `common.delete` e `common.cancel` para os botões:

```tsx
const t = useTranslations('broadcasts')
const tCommon = useTranslations('common')

<DialogTitle>{t('confirm.delete')}</DialogTitle>
<DialogDescription>{t('confirm.deleteDescription')}</DialogDescription>
<Button variant="outline">{tCommon('cancel')}</Button>
<Button variant="destructive">{loading ? t('deleting') : tCommon('delete')}</Button>
```
