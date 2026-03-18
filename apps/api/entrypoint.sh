#!/bin/sh
set -e

echo "▶ Applying database migrations..."
# Busca o binário do Prisma no node_modules (funciona com pnpm + Docker multi-stage)
PRISMA_BIN=$(find /app/node_modules -name "prisma" -path "*/prisma/build/index.js" 2>/dev/null | head -1)
if [ -n "$PRISMA_BIN" ]; then
  node "$PRISMA_BIN" migrate deploy --schema /app/packages/database/prisma/schema.prisma
else
  node /app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
fi
echo "✓ Migrations applied."

exec node /app/apps/api/dist/main.js
