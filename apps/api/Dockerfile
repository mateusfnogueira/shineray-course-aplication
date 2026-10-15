
# ── Stage 1: Dependencies ──────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

RUN corepack enable && \
    corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages/shared/package.json ./packages/shared/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/api/package.json ./apps/api/

# Instala todas as dependências uma única vez
RUN pnpm install --frozen-lockfile

# ── Stage 2: Builder ───────────────────────────────
FROM deps AS builder

WORKDIR /app

COPY packages/shared ./packages/shared
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api

# Gera o Prisma Client
RUN pnpm --filter @compliance/api exec prisma generate

# Compila o NestJS
RUN pnpm --filter @compliance/api build

# ── Stage 3: Runtime ───────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache openssl

# Usuário não-root
RUN addgroup -S nodejs && \
    adduser -S nestjs -G nodejs

# Dependências raiz e pacotes instalados
COPY --from=builder --chown=nestjs:nodejs \
    /app/node_modules ./node_modules

# Links das dependências do workspace API
COPY --from=builder --chown=nestjs:nodejs \
    /app/apps/api/node_modules ./apps/api/node_modules

# Pacotes compartilhados
COPY --from=builder --chown=nestjs:nodejs \
    /app/packages ./packages

# Build do NestJS — must live at apps/api/dist so Node resolves from apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs \
    /app/apps/api/dist ./apps/api/dist

# Schema e migrations
COPY --from=builder --chown=nestjs:nodejs \
    /app/apps/api/prisma ./prisma

# Script de inicialização
COPY --chown=nestjs:nodejs \
    apps/api/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nestjs

EXPOSE 3001

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]

CMD ["node", "apps/api/dist/main.js"]
