# Design System — WhatsApp Tools

Referência visual: [Tasko Dashboard](https://v0-dashboard-ui-redesign-nine.vercel.app/)

---

## Paleta de Cores

Baseada no template **Tasko** — verde-floresta profundo. Cores definidas via CSS variables em `apps/web/src/app/globals.css`.

### Tokens principais

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--primary` | `#005e30` (verde-floresta) | `hsl(153 80% 35%)` | Botões, nav ativo, badges |
| `--primary-foreground` | `#f3fbf5` (branco esverdeado) | `#ffffff` | Texto sobre primary |
| `--accent` | `#008b46` (verde médio) | `hsl(153 60% 25%)` | Links, hover states |
| `--background` | `#f8f9f5` (off-white esverdeado) | `hsl(160 20% 5%)` | Fundo geral |
| `--card` | `#ffffff` | `hsl(160 18% 7%)` | Fundo de cards |
| `--muted` | `#f1f3eb` (cinza esverdeado) | `hsl(160 15% 14%)` | Fundos secundários |
| `--muted-foreground` | `#707367` | `hsl(150 8% 55%)` | Texto secundário |
| `--border` | `#e3e6de` (cinza esverdeado) | `hsl(160 12% 15%)` | Bordas, divisores |
| `--destructive` | `#e40014` | `hsl(0 62.8% 30.6%)` | Erros, ações perigosas |

### Paleta brand (Tailwind)

Escala completa em `apps/web/tailwind.config.ts`:

| Token | Hex | Uso |
|---|---|---|
| `primary-50` | `#f0fdf6` | Backgrounds sutis |
| `primary-100` | `#dcfce9` | Hover leve |
| `primary-200` | `#bbf7d4` | Borders ativos |
| `primary-300` | `#86efb0` | Indicadores |
| `primary-400` | `#4ade83` | Texto em dark mode |
| `primary-500` | `#008b46` | Botões secundários |
| `primary-600` | `#007a3d` | Hover em botões |
| `primary-700` | `#005e30` | **Primary principal** |
| `primary-800` | `#004a26` | Active/pressed |
| `primary-900` | `#003d1f` | Texto sobre fundo claro |

### Cores semânticas

| Nome | Hex | Uso |
|---|---|---|
| `danger` | `#EF4444` | Erros, exclusões |
| `warning` | `#F59E0B` | Alertas, pendências |
| `info` | `#3B82F6` | Informações, links |
| `success` | `#008b46` | Sucesso, confirmações |

### Chart colors

5 tons de verde para gráficos (`--chart-1` a `--chart-5`):
- `--chart-1`: primary (mais escuro)
- `--chart-2`: accent
- `--chart-3`: verde médio
- `--chart-4`: verde claro
- `--chart-5`: verde pastel

---

## Sidebar

| Propriedade | Valor |
|---|---|
| Largura | `240px` (expandido), `60px` (colapsado) |
| Background | `--sidebar-background` (branco / dark) |
| **Active nav** | `bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-lg` |
| Inactive nav | `text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground` |
| Transição | `transition-all duration-300` |
| Badge (active) | `bg-primary-foreground/20 text-primary-foreground` |
| Badge (inactive) | `bg-primary text-primary-foreground` |

**Sem barra lateral indicadora** — o fundo sólido verde faz o destaque.

---

## Border Radius

`--radius: 1rem` (16px) — cards e inputs arredondados.

| Tailwind | Pixels |
|---|---|
| `rounded-sm` | 4px |
| `rounded` | 6px |
| `rounded-md` | 8px |
| `rounded-lg` | 10px |
| `rounded-xl` | 12px |
| `rounded-2xl` | 16px |

---

## Tipografia

| Propriedade | Valor |
|---|---|
| Font family | Inter (Google Fonts) |
| Base font size | 14px |
| `text-xs` | 12px / 16px |
| `text-sm` | 13px / 20px |
| `text-base` | 14px / 20px |
| `text-md` | 16px / 24px |
| `text-lg` | 18px / 28px |

---

## Dark Mode

- Implementação: `next-themes` com `attribute="class"`
- Default: `defaultTheme="system"` (respeita preferência do OS)
- Toggle: disponível na topbar
- Primary permanece verde (ajustado para `hsl(153 80% 35%)` no dark)
- Backgrounds e borders usam tons escuros esverdeados

---

## Regras de uso

1. **Nunca usar cores hardcoded** (`emerald-500`, `green-600`) — sempre usar tokens (`primary`, `primary-400`, `bg-primary/10`)
2. **CSS variables** para temas (light/dark) — definidas em `globals.css`
3. **Tailwind classes** para uso em componentes — definidas em `tailwind.config.ts`
4. **Opacidade** via slash notation: `bg-primary/20`, `shadow-primary/25`
5. **Sidebar-specific**: usar `sidebar-*` tokens para consistência

---

## Arquivos-chave

| Arquivo | Conteúdo |
|---|---|
| `apps/web/src/app/globals.css` | CSS variables (light + dark) |
| `apps/web/tailwind.config.ts` | Paleta brand, spacing, radius, animations |
| `apps/web/src/components/layout/sidebar.tsx` | Sidebar com estilo Tasko |
| `apps/web/src/components/ui/button.tsx` | Variantes de botão (CVA) |
| `apps/web/src/components/ui/card.tsx` | Card component base |
