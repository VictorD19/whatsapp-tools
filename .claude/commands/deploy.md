Execute o fluxo de deploy do WhatsApp Sales Platform seguindo exatamente os passos abaixo.

## Contexto

O deploy é **automático via GitHub Actions**. Ao fazer push para `master`:
1. **CI** (`ci.yml`): Roda testes unitários
2. **Deploy** (`deploy.yml`): Testes → Build Docker → Push GHCR → SSH deploy no servidor

O Claude **NÃO precisa** buildar imagens localmente nem executar comandos no servidor.
O fluxo é: **commit → push para master → pipeline cuida do resto**.

## Passos a executar

### Passo 1 — Verificar status do git

```bash
git status
git log --oneline -5
```

- Mostrar ao usuário quais commits serão deployados
- Se houver mudanças não commitadas relevantes, alertar (não bloquear)
- Verificar se está na branch `master` (ou se precisa fazer merge)

### Passo 2 — Rodar testes localmente (validação rápida)

```bash
pnpm --filter @repo/api test
```

Se os testes falharem, **parar e corrigir antes de fazer push**.
A pipeline vai rodar os mesmos testes — melhor pegar erros localmente.

### Passo 3 — Push para master

```bash
git push origin master
```

Isso dispara automaticamente a pipeline de deploy no GitHub Actions.

### Passo 4 — Confirmar ao usuário

Após o push, informar:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Push feito! A pipeline vai cuidar do deploy:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. ✓ Testes (GitHub Actions)
  2. ✓ Build Docker (API + Web)
  3. ✓ Push para GHCR
  4. ✓ Deploy via SSH no servidor (137.184.68.84)

 Acompanhe em: https://github.com/VictorD19/whatsapp-tools/actions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Regras

- **NUNCA** executar `make release` ou `docker build` — a pipeline faz isso
- **NUNCA** executar comandos no servidor — a pipeline faz SSH automaticamente
- Sempre rodar testes locais antes do push para evitar falha na pipeline
- Sempre mostrar o último commit que está sendo deployado
- Se o push falhar, mostrar o erro e orientar o usuário
- Se estiver em outra branch (não master), perguntar se quer fazer merge antes
