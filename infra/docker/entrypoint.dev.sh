#!/bin/sh
set -e

# ───────────────────────────────────────────────────────────
# entrypoint.dev.sh — instala dependências apenas quando necessário
# Compara hash do pnpm-lock.yaml com o salvo no volume de node_modules.
# Se igual, pula install e vai direto pro dev server.
# ───────────────────────────────────────────────────────────

LOCK_HASH_FILE="/app/node_modules/.lock-hash"
CURRENT_HASH=$(sha256sum /app/pnpm-lock.yaml | cut -d' ' -f1)
SAVED_HASH=""

if [ -f "$LOCK_HASH_FILE" ]; then
  SAVED_HASH=$(cat "$LOCK_HASH_FILE")
fi

if [ "$CURRENT_HASH" != "$SAVED_HASH" ]; then
  echo "📦 Dependências desatualizadas — executando pnpm install..."
  pnpm install --frozen-lockfile || pnpm install
  echo "$CURRENT_HASH" > "$LOCK_HASH_FILE"
  echo "✅ Dependências instaladas."
else
  echo "⚡ Dependências já atualizadas — pulando install."
fi

# Executa o comando passado (ex: pnpm --filter @repo/api dev)
exec "$@"
