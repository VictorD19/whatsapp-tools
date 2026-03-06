# RULE: Padrões de UI para formulários e ações destrutivas

## Princípio

Formulários de cadastro/edição usam **Sheet lateral** (slide-in à direita).
Confirmações destrutivas usam **Dialog modal** (centralizado).

---

## Quando usar Sheet (formulários)

- Criar novo registro (usuário, contato, tag, pipeline, etc.)
- Editar registro existente
- Alterar senha ou configurações de um item
- Qualquer formulário com inputs de preenchimento

```tsx
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'

<Sheet open={open} onOpenChange={(v) => !v && onClose()}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Novo Item</SheetTitle>
      <SheetDescription>Preencha os dados</SheetDescription>
    </SheetHeader>
    <div className="space-y-4 py-4">
      {/* campos do formulário */}
    </div>
    <SheetFooter>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button onClick={onSubmit} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## Quando usar Dialog (confirmações)

- Exclusão / desativação de registro
- Ações irreversíveis que precisam de confirmação explícita
- Alertas ou avisos críticos

```tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Confirmar exclusão</DialogTitle>
      <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button variant="destructive" onClick={onConfirm} disabled={loading}>
        {loading ? 'Excluindo...' : 'Excluir'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Regras obrigatórias

1. **Nunca** usar `Dialog` para formulários de cadastro/edição — sempre `Sheet`
2. **Nunca** usar `Sheet` para confirmações destrutivas — sempre `Dialog`
3. Sheet abre pelo lado **direito** (default do componente)
4. Botões de ação ficam no `SheetFooter` / `DialogFooter`
5. Formulários dentro de Sheet usam `space-y-4 py-4` para espaçamento consistente
