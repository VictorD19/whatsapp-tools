# ───────────────────────────────────────────────────────────
# WEB Dockerfile — build from monorepo root (context: ./)
# ───────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN npm install -g pnpm@10

# ── 1. Install dependencies ────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace config + lockfile first (cache layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy only package.json from each workspace (for install cache)
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN pnpm install --frozen-lockfile

# ── 2. Build ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# NEXT_PUBLIC_* must be available at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ARG NEXT_PUBLIC_APP_NAME="WhatsApp Tools"
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SENTRY_DSN=""

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules

# Copy source files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/web/ ./apps/web/
COPY packages/ ./packages/

# Build Next.js (standalone output)
# With outputFileTracingRoot=../../ the standalone includes the full monorepo structure
RUN pnpm --filter @repo/web build

# ── 3. Production runner ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy standalone output (with outputFileTracingRoot, server.js is at apps/web/server.js)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# ── Security hardening ────────────────────────────────────
# Remove network tools to hamper reverse shells
# Shell is kept (needed by docker-entrypoint.sh and healthcheck wget)
RUN apk del --no-cache apk-tools 2>/dev/null; \
    rm -f /usr/bin/wget /usr/bin/curl /usr/bin/nc \
           /usr/bin/ncat /usr/bin/netcat /usr/bin/telnet \
           /usr/bin/ssh /usr/bin/scp /usr/bin/rsync 2>/dev/null; \
    find / -maxdepth 3 \( -name "nc" -o -name "netcat" -o -name "ncat" \) -delete 2>/dev/null; true

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
