# ─────────────────────────────────────────────────────────
# Makefile — WhatsApp Sales Platform
# Único pré-requisito: Docker + Docker Compose
# ─────────────────────────────────────────────────────────

.PHONY: help setup dev stop restart logs logs-api logs-web logs-evo \
        migrate migrate-deploy seed db-studio db-reset \
        test test-coverage build push release deploy infra-up clean nuke \
        shell-api shell-web shell-db

# ── Cores ────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
NC     := \033[0m

# ── Atalhos ──────────────────────────────────────────────
DC         := docker compose
DC_PROD    := docker compose -f docker-compose.prod.yml

# ── Registry — configure no .env: REGISTRY=ghcr.io/sua-org/whatsapp-tools ──
-include .env
export
TAG        ?= latest

help: ## Mostra esta ajuda
	@echo ""
	@echo "$(CYAN)WhatsApp Sales Platform$(NC) — Comandos disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ─── Setup inicial ───────────────────────────────────────

setup: ## Primeira vez: cria .env + sobe tudo + migration + seed
	@echo "$(CYAN)━━━ Setup inicial ━━━$(NC)"
	@# 1. Criar .env se não existir
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓$(NC) .env criado (edite os secrets antes de produção)"; \
	else \
		echo "$(YELLOW)⊘$(NC) .env já existe — pulando"; \
	fi
	@# 2. Build + subir tudo
	@echo "$(CYAN)▸ Subindo containers...$(NC)"
	$(DC) up -d --build
	@# 3. Aguardar API estar pronta (entrypoint roda pnpm install)
	@echo "$(CYAN)▸ Aguardando API instalar dependências...$(NC)"
	@$(DC) exec api sh -c "until [ -f /app/node_modules/.lock-hash ]; do sleep 2; done" 2>/dev/null || sleep 15
	@# 4. Migrations
	@echo "$(CYAN)▸ Rodando migrations...$(NC)"
	$(DC) exec api pnpm --filter @repo/database db:migrate:deploy
	@# 5. Seed
	@echo "$(CYAN)▸ Criando dados iniciais (seed)...$(NC)"
	$(DC) exec api pnpm --filter @repo/database db:seed
	@echo ""
	@echo "$(GREEN)━━━ Setup completo! ━━━$(NC)"
	@echo ""
	@echo "  Frontend:  $(CYAN)http://localhost:3000$(NC)"
	@echo "  API:       $(CYAN)http://localhost:3001$(NC)"
	@echo "  Evolution: $(CYAN)http://localhost:8085$(NC)"
	@echo ""
	@echo "  Login:     $(YELLOW)admin@admin.com$(NC) / $(YELLOW)admin123$(NC)"
	@echo ""

# ─── Dev (dia a dia) ─────────────────────────────────────

dev: ## Sobe todos os containers (uso diário)
	$(DC) up -d
	@echo ""
	@echo "$(GREEN)✓ Tudo rodando$(NC)"
	@echo "  Frontend:  $(CYAN)http://localhost:3000$(NC)"
	@echo "  API:       $(CYAN)http://localhost:3001$(NC)"
	@echo "  Evolution: $(CYAN)http://localhost:8085$(NC)"
	@echo ""

stop: ## Para todos os containers
	$(DC) stop

restart: ## Reinicia todos os containers
	$(DC) restart

rebuild: ## Rebuilda e sobe (após mudar Dockerfile ou entrypoint)
	$(DC) up -d --build

# ─── Registry & Release (build local → push → deploy no servidor) ────────────
#
#  LOCAL — build e push das imagens:
#    make release           → build + push com tag :latest
#    make release TAG=v1.2  → build + push com tag :v1.2 e :latest
#
#  SERVIDOR — apenas pull + restart (sem build):
#    make deploy            → pull api+web e reinicia
#    make infra-up          → sobe apenas infra (postgres, redis, evolution, minio)
#
#  Pré-requisito: REGISTRY definido no .env
#    Exemplo: REGISTRY=ghcr.io/sua-org/whatsapp-tools
#             IMAGE_TAG=latest  (opcional — padrão: latest)

build: ## Builda imagens de produção localmente (requer REGISTRY no .env)
	@test -n "$(REGISTRY)" || (echo "$(YELLOW)✗ REGISTRY não definido no .env$(NC)" && exit 1)
	@echo "$(CYAN)▸ Build API$(NC) → $(REGISTRY)/api:$(TAG)"
	docker build \
		-f apps/api/Dockerfile \
		-t $(REGISTRY)/api:$(TAG) \
		-t $(REGISTRY)/api:latest \
		.
	@echo "$(CYAN)▸ Build Web$(NC) → $(REGISTRY)/web:$(TAG)"
	docker build \
		-f apps/web/Dockerfile \
		--build-arg NEXT_PUBLIC_API_URL=$(NEXT_PUBLIC_API_URL) \
		--build-arg NEXT_PUBLIC_WS_URL=$(NEXT_PUBLIC_WS_URL) \
		--build-arg NEXT_PUBLIC_APP_NAME="$(NEXT_PUBLIC_APP_NAME)" \
		--build-arg NEXT_PUBLIC_APP_URL=$(NEXT_PUBLIC_APP_URL) \
		--build-arg NEXT_PUBLIC_SENTRY_DSN=$(NEXT_PUBLIC_SENTRY_DSN) \
		-t $(REGISTRY)/web:$(TAG) \
		-t $(REGISTRY)/web:latest \
		.
	@echo "$(GREEN)✓ Imagens buildadas → :$(TAG) e :latest$(NC)"

push: ## Faz push das imagens para o registry
	@test -n "$(REGISTRY)" || (echo "$(YELLOW)✗ REGISTRY não definido no .env$(NC)" && exit 1)
	docker push $(REGISTRY)/api:$(TAG)
	docker push $(REGISTRY)/api:latest
	docker push $(REGISTRY)/web:$(TAG)
	docker push $(REGISTRY)/web:latest
	@echo "$(GREEN)✓ Push concluído: $(REGISTRY) → :$(TAG) e :latest$(NC)"

release: build push ## Build + push completo (make release TAG=v1.2.3)

deploy: ## SERVIDOR: pull das imagens e reinicia api+web (sem build)
	@test -n "$(REGISTRY)" || (echo "$(YELLOW)✗ REGISTRY não definido no .env$(NC)" && exit 1)
	@echo "$(CYAN)▸ Pulling imagens atualizadas...$(NC)"
	$(DC_PROD) pull api web
	@echo "$(CYAN)▸ Reiniciando serviços...$(NC)"
	$(DC_PROD) up -d --no-build api web
	@echo "$(CYAN)▸ Rodando migrations...$(NC)"
	$(DC_PROD) exec api pnpm --filter @repo/database db:migrate:deploy
	@echo "$(GREEN)✓ Deploy concluído!$(NC)"

infra-up: ## SERVIDOR: sobe apenas infra (postgres, redis, evolution, minio)
	$(DC_PROD) up -d postgres redis evolution minio

# ─── Logs ─────────────────────────────────────────────────

logs: ## Mostra logs de todos os serviços (Ctrl+C para sair)
	$(DC) logs -f --tail=100

logs-api: ## Logs só da API
	$(DC) logs -f --tail=100 api

logs-web: ## Logs só do frontend
	$(DC) logs -f --tail=100 web

logs-evo: ## Logs só da Evolution API
	$(DC) logs -f --tail=100 evolution

# ─── Banco de dados ──────────────────────────────────────

migrate: ## Cria nova migration (dev) — pede nome interativo
	$(DC) exec api pnpm --filter @repo/database db:migrate

migrate-deploy: ## Aplica migrations existentes (prod/CI)
	$(DC) exec api pnpm --filter @repo/database db:migrate:deploy

seed: ## Roda o seed (cria tenant + admin)
	$(DC) exec api pnpm --filter @repo/database db:seed

db-studio: ## Abre Prisma Studio (visualizador web do banco)
	@echo "$(CYAN)Abrindo Prisma Studio na porta 5555...$(NC)"
	$(DC) exec api pnpm --filter @repo/database db:studio

db-generate: ## Regenera o Prisma Client (após mudar schema.prisma)
	$(DC) exec api pnpm --filter @repo/database db:generate

db-reset: ## CUIDADO: Apaga tudo e recria o banco do zero
	@echo "$(YELLOW)⚠  Isso vai APAGAR todos os dados. Ctrl+C para cancelar.$(NC)"
	@sleep 3
	$(DC) exec api pnpm --filter @repo/database prisma migrate reset --force

# ─── Testes ───────────────────────────────────────────────

test: ## Roda todos os testes
	$(DC) exec api pnpm --filter @repo/api test

test-coverage: ## Testes com relatório de cobertura
	$(DC) exec api pnpm --filter @repo/api test -- --coverage

test-watch: ## Testes em modo watch (re-roda ao salvar)
	$(DC) exec api pnpm --filter @repo/api test -- --watch

# ─── Shell (debug) ────────────────────────────────────────

shell-api: ## Abre shell dentro do container da API
	$(DC) exec api sh

shell-web: ## Abre shell dentro do container do frontend
	$(DC) exec web sh

shell-db: ## Abre psql no PostgreSQL
	$(DC) exec postgres psql -U postgres -d whatsapp_tools

# ─── Limpeza ──────────────────────────────────────────────

clean: ## Para containers e remove volumes de node_modules
	$(DC) down -v --remove-orphans
	@echo "$(GREEN)✓ Containers e volumes removidos$(NC)"

nuke: ## NUCLEAR: remove tudo (containers + volumes + imagens do projeto)
	@echo "$(YELLOW)⚠  Isso vai remover TUDO (containers, volumes, dados do banco). Ctrl+C para cancelar.$(NC)"
	@sleep 5
	$(DC) down -v --remove-orphans --rmi local
	@echo "$(GREEN)✓ Tudo removido. Use 'make setup' para recomeçar do zero.$(NC)"
