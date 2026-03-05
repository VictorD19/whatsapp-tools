# ─────────────────────────────────────────────────────────
# Makefile — WhatsApp Sales Platform
# Único pré-requisito: Docker + Docker Compose
# ─────────────────────────────────────────────────────────

.PHONY: help setup dev stop restart logs logs-api logs-web logs-evo \
        migrate migrate-deploy seed db-studio db-reset \
        test test-coverage build clean nuke \
        shell-api shell-web shell-db

# ── Cores ────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
NC     := \033[0m

# ── Atalhos ──────────────────────────────────────────────
DC := docker compose

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
