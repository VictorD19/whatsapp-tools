FROM node:24-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@10
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY packages ./packages
RUN pnpm --filter @repo/database db:generate && pnpm --filter @repo/api build
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL="" NEXT_PUBLIC_WS_URL="" NEXT_PUBLIC_APP_URL=https://instagram-review.sistemazapchat.com NEXT_PUBLIC_INSTAGRAM_PILOT=true NEXT_PUBLIC_INSTAGRAM_REVIEW_FIXTURES=true NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm --filter @repo/web exec next build --webpack

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/web/.next/standalone ./web
COPY --from=builder /app/apps/web/.next/static ./web/apps/web/.next/static
COPY --from=builder /app/apps/web/public ./web/apps/web/public
COPY tools/instagram-review-gateway.mjs ./tools/instagram-review-gateway.mjs
COPY infra/instagram-host/start.cjs ./infra/instagram-host/start.cjs
COPY infra/instagram-host/bootstrap.cjs ./infra/instagram-host/bootstrap.cjs
RUN chown node:node /app
ENV NODE_PATH=/app/apps/api/node_modules
# The supervisor reads the root-only secret, then drops to uid/gid1000 before starting any server.
CMD ["node", "infra/instagram-host/start.cjs"]
