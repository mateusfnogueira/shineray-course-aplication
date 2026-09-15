# Compliance Training Platform

Plataforma web corporativa de treinamentos de compliance para redes de lojas.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 15 (App Router) |
| Backend | NestJS 10 |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 5 |
| Linguagem | TypeScript 5.6 (strict) |
| Componentes | shadcn/ui + Tailwind CSS |
| Forms | React Hook Form + Zod |
| HTTP Client | TanStack Query + Axios |
| Auth | JWT (access 15min + refresh 7d, rotativo) |
| Hash de senha | Argon2id |
| Storage | MinIO (local) / S3-compatible (prod) |
| Email | Mailpit (dev) / Resend (prod) |

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

## Setup inicial

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# 3. Subir serviços locais
pnpm docker:up

# 4. Rodar migrations do banco
pnpm db:migrate

# 5. Iniciar o ambiente de desenvolvimento
pnpm dev
```

## Serviços locais (Docker)

| Serviço | URL | Credenciais padrão |
|---|---|---|
| API (NestJS) | http://localhost:3001 | — |
| Web (Next.js) | http://localhost:3000 | — |
| Swagger UI | http://localhost:3001/api/docs | — |
| PostgreSQL | localhost:5432 | compliance / compliance |
| Mailpit (SMTP UI) | http://localhost:8025 | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Redis | localhost:6379 | — |

## Scripts disponíveis

```bash
pnpm dev           # Inicia todos os serviços em modo desenvolvimento
pnpm build         # Build de produção de todos os apps
pnpm lint          # Lint em todos os workspaces
pnpm typecheck     # Typecheck em todos os workspaces
pnpm test          # Testes unitários e de integração
pnpm test:e2e      # Testes end-to-end (Playwright)
pnpm db:migrate    # Executa migrations do Prisma (dev)
pnpm db:deploy     # Executa migrations do Prisma (produção)
pnpm db:seed       # Popula o banco com dados de desenvolvimento
pnpm db:studio     # Abre o Prisma Studio
pnpm docker:up     # Sobe todos os containers Docker
pnpm docker:down   # Para todos os containers Docker
pnpm docker:logs   # Exibe logs dos containers
```

## Estrutura do monorepo

```
course-application/
├── apps/
│   ├── web/          # Next.js 15 App Router (porta 3000)
│   └── api/          # NestJS 10 (porta 3001)
├── packages/
│   ├── shared/       # Enums, tipos e utilitários sem dependência de framework
│   ├── validation/   # Schemas Zod compartilhados
│   ├── ui/           # Componentes shadcn/ui reutilizáveis
│   ├── api-client/   # Cliente HTTP tipado (axios + hooks)
│   ├── eslint-config/    # Configurações ESLint compartilhadas
│   └── typescript-config/ # Configurações TypeScript base
├── infra/            # Docker, scripts de infraestrutura
├── docs/             # Documentação técnica
├── docker-compose.yml
├── .env.example
└── turbo.json
```

## Perfis de usuário

| Perfil | Escopo | Descrição |
|---|---|---|
| `MASTER_ADMIN` | Global | Acesso total ao sistema |
| `STORE_ADMIN` | Própria loja | Gestão de alunos e visualização de relatórios |
| `STUDENT` | Própria loja | Consumo de cursos e emissão de certificados |

> ⚠️ Não existe cadastro público. Todos os usuários são criados por administradores.

## Fases de implementação

- [x] **Fase 1** — Fundação (Turborepo, NestJS, Next.js, Prisma, Docker)
- [ ] **Fase 2** — Autenticação (JWT, refresh token, primeiro acesso, RBAC)
- [ ] **Fase 3** — Lojas e usuários
- [ ] **Fase 4** — Cursos e conteúdo
- [ ] **Fase 5** — Área do aluno
- [ ] **Fase 6** — Testes e avaliações
- [ ] **Fase 7** — Certificados
- [ ] **Fase 8** — Métricas e relatórios
- [ ] **Fase 9** — Recursos complementares
- [ ] **Fase 10** — Qualidade, testes E2E e deploy

## Segurança

- Nenhuma autorização é feita exclusivamente no frontend
- Toda query mutável filtra por `storeId` para STORE_ADMIN e STUDENT
- `storeId` nunca é aceito do payload para perfis de escopo restrito — sempre extraído do JWT
- Eventos de auditoria são imutáveis (append-only)
- Tokens de ativação e reset são hashes SHA-256 com TTL e uso único

## Usuarios de Desenvolvimento

- MASTER_ADMIN	mateusfranco@gmail.com	Admin@2026!
- STORE_ADMIN A	admin-a@compliance.local	Admin@2026!
- STORE_ADMIN B	admin-b@compliance.local	Admin@2026!
- STUDENT (Loja A)	aluno1-5@loja-a.local	Student@2026!
- STUDENT (Loja B)	aluno1-5@loja-b.local	Student@2026!

---

> **Nota:** Credenciais de desenvolvimento estão documentadas nos comentários do arquivo `.env.example`.
> Nunca utilize as credenciais de desenvolvimento em ambiente de produção.
