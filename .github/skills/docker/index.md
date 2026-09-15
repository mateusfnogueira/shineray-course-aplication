---
name: docker
description: Convenções Docker para o MareApp — Dockerfile multi-stage, secrets via entrypoint, Docker Compose local
type: skill
---

# Docker — MareApp

## Dockerfile multi-stage

Todo serviço usa três estágios: `deps` → `builder` → `runner`.

```dockerfile
# ── Etapa 1: dependências ──────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ── Etapa 2: build ────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ── Etapa 3: runtime mínimo ───────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3333
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
```

## `NEXT_PUBLIC_*` são variáveis de build, não de runtime

Apps Next.js que usam `NEXT_PUBLIC_*` precisam receber essas variáveis como `ARG` no estágio de build — elas são baked no bundle JavaScript e **não existem em runtime**.

```dockerfile
FROM node:22-alpine AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CDN_URL
RUN pnpm run build   # usa os ARGs acima
```

Consequência: `client-web` não tem secrets de runtime — o `docker-entrypoint.sh` é trivial (`exec "$@"`).

## Injeção de secrets via `docker-entrypoint.sh`

O entrypoint resolve Docker Secrets (arquivo em `/run/secrets/`) para env vars antes de iniciar o Node.js. Se o arquivo não existir (Cloud Run, Railway, ECS), a env var já chegou direta — o bloco não executa.

```sh
#!/bin/sh
[ -f /run/secrets/mareapp_database_url ]          && export DATABASE_URL=$(cat /run/secrets/mareapp_database_url)
[ -f /run/secrets/mareapp_redis_url ]             && export REDIS_URL=$(cat /run/secrets/mareapp_redis_url)
[ -f /run/secrets/mareapp_auth_secret ]           && export AUTH_SECRET=$(cat /run/secrets/mareapp_auth_secret)
# ... demais secrets do serviço
exec "$@"
```

O mapeamento `nome-do-arquivo` → `NOME_DA_ENV_VAR` é **explícito e manual** — não há magia de prefixo ou uppercase automático.

## Convenção de nomes de secrets no Swarm

```
mareapp_{nome_da_var_em_snake_case}

Exemplos:
  mareapp_database_url
  mareapp_auth_secret
  mareapp_stripe_secret_key
  mareapp_r2_access_key_id
```

O prefixo `mareapp_` evita colisão com secrets de outros projetos no mesmo Swarm.

## Docker Compose local

O Compose local sobe todos os serviços com `.env.local` — sem Docker Secrets (apenas para desenvolvimento):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mareapp
      POSTGRES_USER: mareapp
      POSTGRES_PASSWORD: devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./apps/api
      target: builder   # usa estágio de build para hot-reload
    env_file:
      - ./apps/api/.env.local
    ports:
      - "3333:3333"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./apps/api:/app   # hot-reload em dev

volumes:
  postgres_data:
```

## O que NÃO fazer

- Nunca usar `environment: DATABASE_URL_FILE: ...` — usar entrypoint para ler o arquivo
- Nunca copiar `.env*` para dentro da imagem — usar `env_file` só no Compose local
- Nunca usar `latest` como tag de imagem em produção — usar SHA ou versão semântica
- Nunca rodar como `root` no runner — adicionar `USER node` antes do `EXPOSE`

## Referências

- `mare_app_docs/infra/env-templates.md` — lista completa de secrets por serviço e entrypoints
- `mare_app_docs/infra/deployment.md` — topologia Docker Swarm em produção
