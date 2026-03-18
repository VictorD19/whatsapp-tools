#!/bin/sh
set -e

echo "▶ Applying database migrations..."
npx --prefix /app/packages/database prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
echo "✓ Migrations applied."

exec node /app/apps/api/dist/main.js
