# Guia de Setup — WhatsApp Sales Platform

> **Todo o desenvolvimento roda via Docker.** Você **NÃO precisa** instalar Node.js, pnpm ou qualquer dependência no seu sistema operacional. Funciona em Linux, macOS e Windows (WSL2 ou Docker Desktop) sem alterações.

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Setup Rápido (primeira vez)](#2-setup-rápido-primeira-vez)
3. [Uso Diário](#3-uso-diário)
4. [Comandos Disponíveis (Makefile)](#4-comandos-disponíveis-makefile)
5. [Banco de Dados](#5-banco-de-dados)
6. [Variáveis de Ambiente](#6-variáveis-de-ambiente)
7. [Deploy em Produção](#7-deploy-em-produção)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Pré-requisitos

| Ferramenta       | Versão mínima | Como instalar |
|------------------|---------------|---------------|
| **Docker**       | 24+           | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | 2.20+       | Incluído no Docker Desktop |
| **Git**          | 2.x           | `sudo apt install git` (Linux) ou [git-scm.com](https://git-scm.com/) |
| **Make**         | qualquer      | Já instalado no Linux/macOS. Windows: ver [seção WSL2](#windows-wsl2) |

> **Só isso.** Não instale Node.js, npm, pnpm ou qualquer outro runtime. O Docker cuida de tudo.

### Windows (WSL2)

O jeito recomendado de rodar no Windows:

1. **Instale o WSL2** com Ubuntu 24.04:
   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

2. **Instale o Docker Desktop** e ative a integração com WSL2:
   - Docker Desktop → Settings → Resources → WSL Integration → Habilite Ubuntu-24.04

3. **Clone o projeto DENTRO do WSL2** (performance muito melhor):
   ```bash
   # Abra o terminal do Ubuntu (não o PowerShell!)
   cd ~
   git clone <repo-url> whatsapp-tools
   cd whatsapp-tools
   ```

   > **IMPORTANTE:** O projeto DEVE ficar no filesystem do Linux (`/home/user/...`), **NÃO** no Windows (`/mnt/c/...`). Usar `/mnt/c/` causa lentidão extrema e erros de permissão.

4. Instale `make` se necessário:
   ```bash
   sudo apt update && sudo apt install -y make
   ```

5. Siga o [Setup Rápido](#2-setup-rápido-primeira-vez) normalmente.

### macOS

Docker Desktop já inclui tudo. Basta instalar e seguir o setup.

### Linux

```bash
# Docker (se ainda não tem)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout e login novamente para aplicar o grupo docker

# Make (geralmente já vem instalado)
sudo apt install -y make   # Debian/Ubuntu
```

---

## 2. Setup Rápido (primeira vez)

```bash
# 1. Clone o repositório
git clone <repo-url> whatsapp-tools
cd whatsapp-tools

# 2. Rode o setup (cria .env, builda, instala deps, migration, seed — tudo automático)
make setup
```

**Pronto!** Acesse:

| Serviço       | URL                          |
|---------------|------------------------------|
| **Frontend**  | http://localhost:3000         |
| **API**       | http://localhost:3001         |
| **Evolution** | http://localhost:8085         |
| **Swagger**   | http://localhost:3001/api/docs |

**Login:** `admin@admin.com` / `admin123`

### O que o `make setup` faz por baixo:

1. Cria `.env` a partir de `.env.example` (se não existir)
2. Builda a imagem Docker dev (Node 20 + pnpm)
3. Sobe todos os containers (API, Web, Evolution, Postgres, Redis)
4. O entrypoint instala dependências automaticamente (`pnpm install` dentro do container)
5. Roda `prisma migrate deploy` (cria as tabelas)
6. Roda `db:seed` (cria tenant padrão + usuário admin)

---

## 3. Uso Diário

```bash
# Começar a trabalhar (sobe os containers)
make dev

# Parar no fim do dia
make stop

# Ver logs em tempo real
make logs        # todos
make logs-api    # só backend
make logs-web    # só frontend

# Reiniciar após travar
make restart
```

O hot-reload funciona automaticamente — edite qualquer arquivo e o container recompila.

---

## 4. Comandos Disponíveis (Makefile)

Execute `make help` para ver todos:

### Setup & Dev
| Comando           | Descrição |
|-------------------|-----------|
| `make setup`      | Primeira vez: cria .env + sobe tudo + migration + seed |
| `make dev`        | Sobe todos os containers (uso diário) |
| `make stop`       | Para todos os containers |
| `make restart`    | Reinicia todos os containers |
| `make rebuild`    | Rebuilda imagem (após mudar Dockerfile/entrypoint) |

### Logs
| Comando           | Descrição |
|-------------------|-----------|
| `make logs`       | Logs de todos os serviços |
| `make logs-api`   | Logs só da API |
| `make logs-web`   | Logs só do frontend |
| `make logs-evo`   | Logs só da Evolution API |

### Banco de Dados
| Comando              | Descrição |
|----------------------|-----------|
| `make migrate`       | Cria nova migration (desenvolvimento) |
| `make migrate-deploy`| Aplica migrations existentes |
| `make seed`          | Roda o seed (cria tenant + admin) |
| `make db-studio`     | Abre Prisma Studio (visualizador web do banco) |
| `make db-generate`   | Regenera Prisma Client (após mudar schema.prisma) |
| `make db-reset`      | **CUIDADO:** Apaga tudo e recria do zero |

### Testes
| Comando              | Descrição |
|----------------------|-----------|
| `make test`          | Roda todos os testes |
| `make test-coverage` | Testes com relatório de cobertura |
| `make test-watch`    | Testes em modo watch |

### Shell (debug)
| Comando           | Descrição |
|-------------------|-----------|
| `make shell-api`  | Abre shell dentro do container da API |
| `make shell-web`  | Abre shell dentro do container do frontend |
| `make shell-db`   | Abre psql no PostgreSQL |

### Limpeza
| Comando        | Descrição |
|----------------|-----------|
| `make clean`   | Remove containers + volumes de node_modules |
| `make nuke`    | **NUCLEAR:** remove tudo (containers + volumes + dados + imagens) |

---

## 5. Banco de Dados

### Bancos utilizados

| Banco              | Quem usa           | Criação |
|--------------------|--------------------|---------|
| `whatsapp_tools`   | Aplicação (Prisma) | Docker Compose cria automaticamente |
| `evolution`        | Evolution API      | Script `init-evolution-db.sql` cria automaticamente |

### Workflow de alteração no schema

```bash
# 1. Edite packages/database/prisma/schema.prisma

# 2. Crie a migration (dentro do container)
make migrate

# 3. Prisma Client é regenerado automaticamente
# Se precisar forçar: make db-generate
```

### Migrations existentes

| Migration | Descrição |
|-----------|-----------|
| `20260303175033_init` | Schema inicial (Tenant, User, Instance, Contact, Conversation, Message) |
| `20260303191346_add_message_tenant_relation` | Relação Message → Tenant |

---

## 6. Variáveis de Ambiente

### `.env` (raiz — usado pelo Docker Compose)

| Variável              | Default                              | Descrição |
|-----------------------|--------------------------------------|-----------|
| `JWT_SECRET`          | `change-me-in-production`            | Segredo do JWT (access token) |
| `JWT_REFRESH_SECRET`  | `change-me-refresh-in-production`    | Segredo do refresh token |
| `EVOLUTION_API_KEY`   | `changeme-evolution-key`             | Chave da Evolution API |
| `ANTHROPIC_API_KEY`   | *(vazio)*                            | Chave da API Claude (opcional, para funcionalidades de IA) |
| `MINIO_ACCESS_KEY`    | `minioadmin`                         | Usuário root do MinIO (object storage) |
| `MINIO_SECRET_KEY`    | `minioadmin123`                      | Senha root do MinIO |
| `MINIO_BUCKET`        | `whatsapp-media`                     | Nome do bucket para armazenar mídias |

> Em **desenvolvimento**, os defaults funcionam. Em **produção**, troque todos os secrets.

### Variáveis injetadas automaticamente pelo Docker Compose

Estas variáveis são definidas diretamente no `docker-compose.yml` e **não precisam** de `.env` local nos apps:

- `DATABASE_URL` → PostgreSQL interno (`postgres:5432`)
- `REDIS_URL` → Redis interno (`redis:6379`)
- `EVOLUTION_API_URL` → Evolution interna (`evolution:8080`)
- `NEXT_PUBLIC_API_URL` → `http://localhost:3001`
- `NEXT_PUBLIC_WS_URL` → `http://localhost:3001`

---

## 7. Deploy em Produção

### Com Docker Compose (recomendado para VPS/servidor)

```bash
# 1. Clone e configure
git clone <repo-url> whatsapp-tools
cd whatsapp-tools

# 2. Crie o .env de produção
cp .env.example .env
# Edite com secrets fortes:
#   JWT_SECRET=<gere com: openssl rand -hex 32>
#   JWT_REFRESH_SECRET=<gere com: openssl rand -hex 32>
#   EVOLUTION_API_KEY=<gere com: openssl rand -hex 32>
#   ANTHROPIC_API_KEY=sk-ant-...
#   MINIO_ACCESS_KEY=<usuário forte para o MinIO>
#   MINIO_SECRET_KEY=<senha forte para o MinIO>
#   MINIO_BUCKET=whatsapp-media

# 3. Suba com o compose de produção
docker compose -f docker-compose.prod.yml up -d --build

# 4. Migrations + seed
docker exec wt-api pnpm --filter @repo/database db:migrate:deploy
docker exec wt-api pnpm --filter @repo/database db:seed

# 5. Verificar
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

### Portas em produção

| Serviço   | Porta | Acesso |
|-----------|-------|--------|
| Frontend  | 3000  | Público (via Nginx/reverse proxy) |
| API       | 3001  | Público (via Nginx/reverse proxy) |
| Evolution | 8085  | Interno (não expor publicamente) |
| Postgres  | 5432  | Interno (não expor publicamente) |
| Redis     | 6379  | Interno (não expor publicamente) |

### SSL/HTTPS

Use um reverse proxy (Nginx, Caddy ou Traefik) na frente com certificado Let's Encrypt:

```
seudominio.com       → localhost:3000 (frontend)
api.seudominio.com   → localhost:3001 (API + WebSocket)
```

---

## 8. Troubleshooting

### "Erro ao rodar `pnpm install` no Windows/WSL"

**Não rode `pnpm install` localmente.** Todo o desenvolvimento é via Docker:
```bash
make dev        # sobe tudo
make shell-api  # se precisar rodar algo dentro do container
```

### "Container da API não sobe / fica reiniciando"

```bash
# Veja o log de erro
make logs-api

# Causas comuns:
# 1. Postgres ainda não está pronto → espere ou reinicie
make restart

# 2. Dependências corrompidas → limpe e reinstale
make clean
make setup
```

### "Migrations não rodaram"

```bash
# Rode manualmente
make migrate-deploy

# Se der erro de schema, regenere o client
make db-generate
make migrate-deploy
```

### "Hot reload não funciona no Windows/WSL"

O `docker-compose.yml` já inclui `WATCHPACK_POLLING=true` e `CHOKIDAR_USEPOLLING=true`. Se ainda não funcionar:

1. Confirme que o projeto está em `/home/user/...` (WSL filesystem), **não** em `/mnt/c/...`
2. Reinicie os containers: `make restart`

### "Porta já em uso"

```bash
# Veja quem está usando a porta
sudo lsof -i :3000   # ou 3001, 5432, 6379, 8085

# Se for container antigo, limpe tudo
make clean
make dev
```

### "Evolution API não conecta"

```bash
# Verifique se está rodando
make logs-evo

# Teste a API diretamente
curl http://localhost:8085/
# Esperado: {"status":200,"message":"Welcome to the Evolution API..."}
```

### "Preciso recomeçar do zero"

```bash
# Remove TUDO (containers, volumes, dados do banco, imagens)
make nuke

# Recria tudo limpo
make setup
```

### "Erro de permissão no Docker (Linux)"

```bash
# Adicione seu usuário ao grupo docker
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

---

## Arquitetura dos Containers

```
┌──────────────────────────────────────────────────────────────┐
│                       Docker Network                         │
│                       (wt-network)                           │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌────────────────────┐           │
│  │   web   │  │   api   │  │     evolution      │           │
│  │ Next.js │  │ NestJS  │  │  (WhatsApp/Baileys)│           │
│  │  :3000  │  │  :3001  │  │       :8085        │           │
│  └────┬────┘  └────┬────┘  └────────┬───────────┘           │
│       │            │                │                        │
│       │    ┌───────┼────────┐       │                        │
│       │    │       │        │       │                        │
│       │  ┌─┴──────┐│  ┌─────┴─────┐│  ┌──────────────────┐  │
│       │  │postgres││  │   redis   ││  │     minio        │  │
│       │  │  :5432 ││  │   :6379   ││  │ :9000 (S3 API)   │  │
│       │  └────────┘│  └───────────┘│  │ :9001 (Console)  │  │
│       │            │               │  └──────────────────┘  │
│       │            └───────────────┘                        │
│       │                                                      │
│       └── chama API via http://localhost:3001                │
│           (do browser do usuário)                            │
└──────────────────────────────────────────────────────────────┘
```

### Volumes

| Volume | Conteúdo | Persistente |
|--------|----------|-------------|
| `postgres_data` | Dados do PostgreSQL | Sim |
| `redis_data` | Dados do Redis | Sim |
| `minio_data` | Arquivos de mídia (imagens, vídeos, documentos) | Sim |
| `api_*_modules` | node_modules da API | Sim (cache) |
| `web_*_modules` | node_modules do frontend | Sim (cache) |

Os volumes de `node_modules` são separados por serviço (api vs web) para evitar conflitos. O entrypoint só reinstala quando o `pnpm-lock.yaml` muda.
