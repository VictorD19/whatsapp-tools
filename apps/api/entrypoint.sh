#!/bin/sh
set -e

echo "▶ Applying database migrations..."
/app/node_modules/.pnpm/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma
echo "✓ Migrations applied."

exec node /app/apps/api/dist/main.js
