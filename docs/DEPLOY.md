# Guia de Deploy — WhatsApp Sales Platform

> Este documento cobre tanto o ambiente de desenvolvimento local quanto o deploy em produção via Docker Compose. Leia até o fim antes de começar — há particularidades importantes sobre conflito de portas.

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [Desenvolvimento Local](#3-desenvolvimento-local)
4. [Deploy Produção — Docker Compose](#4-deploy-produção--docker-compose)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Banco de Dados](#6-banco-de-dados)
7. [Particularidades e Armadilhas Conhecidas](#7-particularidades-e-armadilhas-conhecidas)

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Observação |
|---|---|---|
| Node.js | 20+ | Use `nvm` para gerenciar versões |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | 24+ | Necessário para Evolution API e infra |
| Docker Compose | 2.20+ | Incluído no Docker Desktop |
| PostgreSQL | 16 | Via Docker ou instância própria |
| Redis | 7+ | Via Docker ou instância própria |

---

## 2. Estrutura do Projeto

```
whatsapp-tools/
├── apps/
│   ├── api/          ← NestJS (Fastify), porta 8000 (dev) / 3001 (prod)
│   └── web/          ← Next.js 15, porta 8080 (dev) / 3000 (prod)
├── packages/
│   └── database/     ← Prisma schema + migrations + seed
├── docker-compose.yml
├── DEPLOY.md         ← este arquivo
├── ARCHITECTURE.md
└── FEATURES.md
```

---

## 3. Desenvolvimento Local

### 3.1 — Instalar dependências

```bash
git clone <repo-url>
cd whatsapp-tools
pnpm install
```

### 3.2 — Configurar variáveis de ambiente

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.local.example apps/web/.env.local
```

Edite os valores conforme a seção [Variáveis de Ambiente](#5-variáveis-de-ambiente).

**IMPORTANTE:** Em desenvolvimento, a Evolution API roda na **porta 9080** (não 8080) porque o frontend Next.js ocupa a 8080. Ajuste no `.env` da API:

```env
EVOLUTION_API_URL=http://localhost:9080
```

### 3.3 — Subir infraestrutura (PostgreSQL + Redis)

Você pode usar instâncias Docker standalone ou o docker-compose parcial abaixo:

```bash
# Apenas postgres e redis (sem os apps)
docker compose up -d postgres redis
```

Ou, se já tiver PostgreSQL e Redis rodando localmente, pule este passo.

### 3.4 — Subir a Evolution API em dev

A Evolution API **não pode rodar na porta 8080 em dev** porque o frontend Next.js usa essa porta. Use o mapeamento 9080→8080:

```bash
docker run -d \
  --name wt-evolution-dev \
  --add-host host.docker.internal:172.17.0.1 \
  -p 9080:8080 \
  -e SERVER_URL=http://localhost:9080 \
  -e DATABASE_ENABLED=true \
  -e DATABASE_PROVIDER=postgresql \
  -e DATABASE_CONNECTION_URI="postgresql://postgres:postgres@host.docker.internal:5432/evolution" \
  -e DATABASE_SAVE_DATA_INSTANCE=true \
  -e DATABASE_SAVE_DATA_NEW_MESSAGE=true \
  -e DATABASE_SAVE_MESSAGE_UPDATE=true \
  -e DATABASE_SAVE_DATA_CONTACTS=true \
  -e DATABASE_SAVE_DATA_CHATS=true \
  -e REDIS_ENABLED=true \
  -e REDIS_URI=redis://host.docker.internal:6379 \
  -e AUTHENTICATION_API_KEY=B6D711FCDE4D4FD5936544120E713976 \
  -e AUTHENTICATION_TYPE=apikey \
  -e DEL_INSTANCE=false \
  -e LANGUAGE=pt-BR \
  atendai/evolution-api:latest
```

> **Nota:** O IP `172.17.0.1` é o gateway da bridge Docker padrão no Linux (o "host" visto de dentro do container). No macOS/Windows com Docker Desktop, substitua `--add-host host.docker.internal:172.17.0.1` por apenas `--add-host host.docker.internal:host-gateway`.

Verificar se subiu:

```bash
curl http://localhost:9080/
# Esperado: {"status":200,"message":"Welcome to the Evolution API..."}
```

### 3.5 — Criar banco `evolution` no PostgreSQL

A Evolution API precisa de um banco separado:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE evolution;"
```

O container da Evolution API já roda as próprias migrations automaticamente na inicialização.

### 3.6 — Rodar migrations e seed do projeto

```bash
# Gerar client Prisma
pnpm db:generate

# Aplicar migrations
pnpm db:migrate

# Criar tenant padrão + usuário admin
pnpm --filter @repo/database db:seed
```

Credenciais geradas pelo seed:
- **Email:** `admin@admin.com`
- **Senha:** `admin123`

### 3.7 — Iniciar os apps

```bash
# Inicia API (porta 8000) + Web (porta 8080) em paralelo
pnpm dev
```

Ou separadamente:

```bash
pnpm --filter api dev   # http://localhost:8000
pnpm --filter web dev   # http://localhost:8080
```

Documentação Swagger da API: `http://localhost:8000/api/docs`

---

## 4. Deploy Produção — Docker Compose

Em produção tudo sobe via `docker-compose.yml`. Os conflitos de porta de desenvolvimento não existem aqui porque o Next.js roda na 3000 (não 8080).

### 4.1 — Configurar arquivos de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Em produção, ajuste obrigatoriamente:

```env
# apps/api/.env
NODE_ENV=production
JWT_SECRET=<segredo-forte-aleatório>
JWT_REFRESH_SECRET=<segredo-forte-aleatório>
EVOLUTION_API_URL=http://evolution:8080   # nome do serviço Docker
EVOLUTION_API_KEY=<chave-forte-aleatória>
ANTHROPIC_API_KEY=sk-ant-...

# apps/web/.env.local
NEXT_PUBLIC_API_URL=https://api.seudominio.com
NEXT_PUBLIC_WS_URL=https://api.seudominio.com
```

### 4.2 — Build e subida

```bash
docker compose up -d --build
```

Isso sobe: `api`, `web`, `evolution`, `postgres`, `redis`.

### 4.3 — Migrations em produção

Após o primeiro `docker compose up`, rode as migrations dentro do container da API:

```bash
docker exec wt-api pnpm --filter @repo/database db:migrate:deploy
docker exec wt-api pnpm --filter @repo/database db:seed
```

### 4.4 — Verificar status

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f evolution
```

---

## 5. Variáveis de Ambiente

### `apps/api/.env`

| Variável | Dev | Prod | Descrição |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | Modo da aplicação |
| `PORT` | `8000` | `3001` | Porta da API |
| `APP_URL` | `http://localhost:8000` | URL pública | URL base da API |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/whatsapp_tools?schema=public` | Ajustar | String de conexão Prisma |
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` | URL do Redis |
| `JWT_SECRET` | `change-me-in-production` | **Trocar!** | Segredo do JWT (access token) |
| `JWT_REFRESH_SECRET` | `change-me-refresh-in-production` | **Trocar!** | Segredo do refresh token |
| `JWT_EXPIRES_IN` | `15m` | `15m` | Expiração do access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | `7d` | Expiração do refresh token |
| `EVOLUTION_API_URL` | `http://localhost:9080` | `http://evolution:8080` | URL da Evolution API |
| `EVOLUTION_API_KEY` | `B6D711FCDE4D4FD5936544120E713976` | **Trocar!** | Chave de autenticação da Evolution |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Chave real | Chave da API Claude (Anthropic) |

### `apps/web/.env.local`

| Variável | Dev | Prod | Descrição |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL pública da API | Endpoint base para chamadas HTTP |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:8000` | URL pública da API | Endpoint do Socket.io |
| `NEXT_PUBLIC_APP_NAME` | `WhatsApp Tools` | Igual | Nome exibido na UI |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:8080` | URL pública do frontend | URL base do frontend |

---

## 6. Banco de Dados

### Comandos úteis

```bash
# Gerar Prisma Client após mudar o schema
pnpm db:generate

# Criar nova migration (dev)
pnpm db:migrate

# Aplicar migrations existentes (prod/CI)
pnpm --filter @repo/database db:migrate:deploy

# Abrir Prisma Studio (visualizador de dados)
pnpm db:studio

# Recriar tudo do zero (cuidado — apaga dados!)
pnpm --filter @repo/database prisma migrate reset
```

### Migrations existentes

| Migration | Descrição |
|---|---|
| `20260303175033_init` | Schema inicial (Tenant, User, Instance, Contact, Conversation, Message) |
| `20260303191346_add_message_tenant_relation` | Adicionada relação Message → Tenant |

### Bancos necessários

| Banco | Quem usa |
|---|---|
| `whatsapp_tools` | Aplicação principal (Prisma) |
| `evolution` | Evolution API (Prisma interno dela) |

---

## 7. Particularidades e Armadilhas Conhecidas

### Conflito de porta 8080 em desenvolvimento

**Problema:** O frontend Next.js roda na porta 8080 e a Evolution API também usa 8080 por padrão. A Evolution API v2 **não respeita** as env vars `PORT` ou `HTTP_PORT` — a porta é hardcoded no binário compilado.

**Solução:** Em dev, mapear a Evolution API para a porta 9080 no host (`-p 9080:8080`) e configurar `EVOLUTION_API_URL=http://localhost:9080` no `.env` da API.

Em produção via docker-compose, não há conflito porque o frontend roda na 3000 e a comunicação é interna pela rede Docker (`http://evolution:8080`).

---

### `@UsePipes` vs `@Body(pipe)` no NestJS

**Problema:** Ao usar `@UsePipes(new ZodValidationPipe(schema))` no nível do método, o NestJS aplica o pipe a **todos os parâmetros em ordem**, incluindo `@CurrentTenant()` (que retorna uma `string`). O schema Zod, que espera um objeto, falha com `"Expected object, received string"`.

**Solução:** Sempre usar o pipe diretamente no parâmetro `@Body`:

```typescript
// ERRADO — pipe aplicado em todos os parâmetros:
@Post()
@UsePipes(new ZodValidationPipe(schema))
create(@CurrentTenant() tenantId: string, @Body() dto: CreateDto) {}

// CORRETO — pipe só no @Body:
@Post()
create(@CurrentTenant() tenantId: string, @Body(new ZodValidationPipe(schema)) dto: CreateDto) {}
```

---

### Evolution API — banco `evolution` separado

A Evolution API cria e gerencia seu próprio schema Prisma no banco `evolution`. Ela roda as migrations automaticamente na inicialização do container. O banco precisa existir antes de subir o container:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE evolution;"
```

---

### Redis — conectividade do container com o host

Ao rodar a Evolution API em bridge network (não host), o Redis do host é acessível via o IP do gateway Docker (`172.17.0.1` no Linux). Por isso o parâmetro `--add-host host.docker.internal:172.17.0.1` é necessário no comando `docker run` de desenvolvimento.

No macOS/Windows (Docker Desktop), usar `--add-host host.docker.internal:host-gateway` em vez do IP fixo.

---

### JWT expira em 15 minutos

O access token expira rápido (15min) para segurança. O frontend usa o refresh token automaticamente. Se o Playwright ou outro cliente de teste receber 401 após um tempo, é necessário fazer login novamente para obter um novo token.

---

### Seed cria usuário idempotente

O seed usa `upsert` — pode ser rodado múltiplas vezes sem duplicar dados. Seguro para usar em CI ou após um `migrate reset`.

---

## Checklist de Primeiro Deploy

- [ ] Clonar o repositório e instalar dependências (`pnpm install`)
- [ ] Copiar e preencher os `.env` de cada app
- [ ] Garantir PostgreSQL e Redis rodando
- [ ] Criar banco `evolution` no PostgreSQL
- [ ] Subir Evolution API (dev: docker run na 9080 / prod: docker-compose)
- [ ] Rodar `pnpm db:generate` e `pnpm db:migrate`
- [ ] Rodar `pnpm --filter @repo/database db:seed`
- [ ] Iniciar os apps (`pnpm dev` ou `docker compose up`)
- [ ] Acessar `http://localhost:8080` (dev) e logar com `admin@admin.com` / `admin123`
- [ ] Criar uma instância em `/instances` e verificar que aparece na listagem
