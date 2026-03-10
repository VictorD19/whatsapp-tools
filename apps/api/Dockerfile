# ───────────────────────────────────────────────────────────
# API Dockerfile — build from monorepo root (context: ./)
# ───────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN npm install -g pnpm@10

# ── 1. Install dependencies ────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace config + lockfile first (cache layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy only package.json from each workspace (for install cache)
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN pnpm install --frozen-lockfile

# ── 2. Build ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules

# Copy source files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Generate Prisma client
RUN pnpm --filter @repo/database db:generate

# Build API
RUN pnpm --filter @repo/api build

# ── 3. Production runner ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy pnpm store (packages live here, referenced by symlinks)
COPY --from=builder /app/node_modules ./node_modules

# Copy app-level node_modules (contains symlinks into the pnpm store above)
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy built dist and package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy Prisma schema (needed for migrations)
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy and configure entrypoint
COPY --from=builder /app/apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["sh", "entrypoint.sh"]
