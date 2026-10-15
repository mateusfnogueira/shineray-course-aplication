
# ── Stage 1: Dependencies ──────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable && \
    corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages/shared/package.json ./packages/shared/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/
COPY packages/validation/package.json ./packages/validation/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ─────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && \
    corepack prepare pnpm@latest --activate

# Reutiliza dependências e links do workspace
COPY --from=deps /app/ ./

# Copia o código da aplicação
COPY packages ./packages
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NODE_OPTIONS="--max-old-space-size=768"

RUN pnpm --filter @compliance/web build

# ── Stage 3: Runtime ───────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário sem privilégios
RUN addgroup -S nodejs && \
    adduser -S nextjs -G nodejs

# Copia somente o necessário
COPY --from=builder --chown=nextjs:nodejs \
    /app/apps/web/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs \
    /app/apps/web/.next/static ./apps/web/.next/static

COPY --from=builder --chown=nextjs:nodejs \
    /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
