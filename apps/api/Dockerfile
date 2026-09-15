# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json             ./packages/shared/
COPY packages/eslint-config/package.json      ./packages/eslint-config/
COPY packages/typescript-config/package.json  ./packages/typescript-config/
COPY apps/api/package.json                    ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules             ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared                           ./packages/shared
COPY packages/eslint-config                    ./packages/eslint-config
COPY packages/typescript-config                ./packages/typescript-config
COPY apps/api                                  ./apps/api

# Re-link workspace symlinks after copy
RUN pnpm install --frozen-lockfile --prefer-offline

RUN pnpm --filter @compliance/api exec prisma generate
RUN pnpm --filter @compliance/api build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

# Copy full node_modules (includes native binaries compiled for Alpine)
COPY --from=builder /app/node_modules   ./node_modules
# Copy workspace packages so pnpm symlinks resolve
COPY --from=builder /app/packages       ./packages
# Copy webpack bundle
COPY --from=builder /app/apps/api/dist  ./dist
# Copy Prisma schema and migrations
COPY --from=builder /app/apps/api/prisma ./prisma

COPY apps/api/docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
