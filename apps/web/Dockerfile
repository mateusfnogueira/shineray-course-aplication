# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json             ./packages/shared/
COPY packages/eslint-config/package.json      ./packages/eslint-config/
COPY packages/typescript-config/package.json  ./packages/typescript-config/
COPY packages/api-client/package.json         ./packages/api-client/
COPY packages/ui/package.json                 ./packages/ui/
COPY packages/validation/package.json         ./packages/validation/
COPY apps/web/package.json                    ./apps/web/

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

COPY --from=deps /app/node_modules              ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages                                   ./packages
COPY apps/web                                   ./apps/web

RUN pnpm install --frozen-lockfile --prefer-offline
RUN pnpm --filter @compliance/web build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output includes only the required node_modules
COPY --from=builder /app/apps/web/.next/standalone  ./
# Static assets are not included in standalone and must be copied separately
COPY --from=builder /app/apps/web/.next/static      ./apps/web/.next/static
COPY --from=builder /app/apps/web/public             ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
