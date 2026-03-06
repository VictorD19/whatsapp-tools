# RULE: Formatação de moeda, datas e fuso horário — sempre via locale store

## Princípio

Toda exibição de **moeda** ou **data/hora** no frontend DEVE usar as funções centrais
de `@/lib/formatting` (ou o hook `useFormatting()`), que leem automaticamente as
configurações do tenant (`locale`, `timezone`, `currency`) via Zustand store.

**Nunca hardcodar** locale (`'pt-BR'`), moeda (`'BRL'`, `'USD'`), símbolo (`R$`, `$`),
ou timezone em componentes.

---

## Funções disponíveis (`@/lib/formatting`)

| Função | Uso |
|---|---|
| `formatCurrency(value)` | Valor monetário completo: `R$ 1.500,00` |
| `formatCurrencyCompact(value)` | Sem decimais: `R$ 1.500` |
| `getCurrencySymbol()` | Apenas o símbolo: `R$`, `$`, etc. |
| `formatDate(date, pattern?)` | Data com timezone: `06/03/2026` |
| `formatTime(date)` | Hora com timezone: `14:30` |
| `formatDateTime(date)` | Data + hora: `06/03/2026 14:30` |
| `formatRelativeDate(date)` | Relativo: `agora`, `5min`, `2h`, `3d` |
| `formatNumber(value)` | Número formatado por locale: `1.500` |

## Hook reativo (`useFormatting()`)

Usar quando o componente precisa **reagir** a mudanças de locale em tempo real:

```tsx
import { useFormatting } from '@/hooks/use-formatting'

function DealCard({ deal }) {
  const { formatCurrency, formatDate } = useFormatting()
  return <span>{formatCurrency(deal.value)}</span>
}
```

## Acesso direto (fora de componentes React)

Para funções utilitárias ou callbacks que não são componentes:

```tsx
import { formatCurrency, formatDate } from '@/lib/formatting'

const label = formatCurrency(1500) // lê a store diretamente
```

---

## Regras obrigatórias

1. **Nunca** usar `.toLocaleString()` com locale/currency hardcoded
2. **Nunca** criar funções locais como `formatBRL()` — usar `formatCurrency()` da lib
3. **Nunca** hardcodar símbolo de moeda (`R$`, `$`, etc.) — usar `getCurrencySymbol()`
4. **Nunca** formatar datas com `new Date().toLocaleDateString('pt-BR')` — usar `formatDate()`
5. **Nunca** formatar horas sem considerar timezone — usar `formatTime()` ou `formatDateTime()`
6. Ao exibir **campo de edição de valor monetário**, usar `getCurrencySymbol()` como placeholder/label
7. Todo componente novo que exiba valor ou data deve importar de `@/lib/formatting` ou `useFormatting()`

---

## Anti-padrões (proibidos)

```tsx
// ERRADO - hardcoded
value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ERRADO - função local
function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ERRADO - símbolo hardcoded
<span>R$ {value}</span>

// ERRADO - data sem timezone
new Date(deal.createdAt).toLocaleDateString('pt-BR')
```

## Padrões corretos

```tsx
// CORRETO - usa store automaticamente
import { formatCurrency, getCurrencySymbol, formatDate } from '@/lib/formatting'

formatCurrency(1500)           // "R$ 1.500,00" (se BRL) ou "$1,500.00" (se USD)
getCurrencySymbol()            // "R$" ou "$"
formatDate(deal.createdAt)     // "06/03/2026" (com timezone correto)
```
