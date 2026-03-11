Execute o fluxo completo de deploy do WhatsApp Sales Platform seguindo exatamente os passos abaixo.

## Contexto

O deploy segue o fluxo: **build local → push para registry → pull no servidor**.
- O build roda na máquina local (não sobrecarrega o servidor)
- O servidor apenas faz `pull` da imagem pronta e reinicia os containers
- Banco de dados e volumes não são afetados pelo deploy

## Argumentos opcionais

O usuário pode passar uma tag de versão. Exemplos:
- `/deploy` → usa `TAG=latest`
- `/deploy v1.3.0` → usa `TAG=v1.3.0`

## Passos a executar

### Passo 1 — Verificar pré-requisitos

```bash
# Verificar se REGISTRY está configurado no .env
grep REGISTRY .env
```

Se `REGISTRY` não estiver configurado, pare e instrua o usuário a adicionar no `.env`:
```
REGISTRY=ghcr.io/sua-org/whatsapp-tools
```

### Passo 2 — Verificar status do git

```bash
git status
git log --oneline -5
```

Mostrar ao usuário quais commits serão deployados. Se houver mudanças não commitadas, alertar (não bloquear).

### Passo 3 — Build e push das imagens

Se o usuário passou uma tag (ex: `/deploy v1.3.0`), use `TAG=v1.3.0`.
Caso contrário use `TAG=latest`.

```bash
make release TAG=<tag>
```

Este comando:
1. Builda a imagem da API (`apps/api/Dockerfile`)
2. Builda a imagem do Web (`apps/web/Dockerfile`) com as variáveis `NEXT_PUBLIC_*` do `.env`
3. Faz push de ambas para o registry com a tag especificada e `:latest`

### Passo 4 — Instruções para o servidor

Após o push bem-sucedido, exibir o bloco de comandos para rodar no servidor:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Deploy pronto! Rode no servidor:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  make deploy

 Ou manualmente:
  docker compose -f docker-compose.prod.yml pull api web
  docker compose -f docker-compose.prod.yml up -d --no-build api web
  docker compose -f docker-compose.prod.yml exec api pnpm --filter @repo/database db:migrate:deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Regras

- Sempre mostrar o último commit que está sendo deployado
- Se `make release` falhar, não continuar — mostrar o erro e pedir ação do usuário
- Não executar comandos no servidor (Claude não tem acesso SSH ao servidor)
- Alertar se as variáveis `NEXT_PUBLIC_API_URL` ou `NEXT_PUBLIC_WS_URL` estiverem com valores de localhost (build errado para produção)
- Após o push, sempre mostrar o bloco de instruções do servidor formatado claramente
