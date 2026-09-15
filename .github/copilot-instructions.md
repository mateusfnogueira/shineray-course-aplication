## Git Workflow

- Nunca incluir atribuição de IA nas mensagens de commit
- Nunca commitar `.env` ou secrets
- Formato: `tipo(escopo): descrição breve em inglês`
- Branches: `feature/*` e `fix/*` partem de `develop`; `hotfix/*` parte de `main` (ver ADR-026)

### Tipos permitidos

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Mudança sem alterar comportamento |
| `test` | Adicionar ou corrigir testes |
| `chore` | Configuração, deps, tooling |
| `docs` | Documentação |
| `ci` | GitHub Actions, runners |
| `perf` | Melhoria de performance |

### Escopos do monorepo

`api` · `admin-web` · `client-web` · `worker` · `types` · `infra` · `billing` · `auth` · `orders` · `comandas` · `menus` · `webhooks`

### Exemplos

```
feat(orders): add state machine for order status transitions
fix(webhooks): reject payload with invalid mercadopago signature
test(orders): add tenant isolation test for GET /orders
chore(infra): add minio service to docker-compose
refactor(prisma): migrate tenant filter from $use to $extends
```

### Breaking changes

```
feat(api)!: rename /carts to /comandas endpoint

BREAKING CHANGE: endpoint /carts removido; usar /comandas.
```

## Conceitos Importantes

Focar nesses princípios em todo o código:

- type-safety e2e (DTOs compartilhados via `packages/types`)
- monitoramento de erros / observabilidade
- isolamento multi-tenant via `account_id` em toda query mutável
- audit append-only para eventos financeiros

Diretrizes detalhadas de código vivem em `.github/instructions/` e são aplicadas automaticamente pelo Copilot conforme o tipo de arquivo:

- `software-engineering.instructions.md` — princípios gerais (todos os arquivos)
- `typescript.instructions.md` — TypeScript/JavaScript (`**/*.{ts,tsx}`)
- `react.instructions.md` — React/Next.js (`apps/{admin-web,client-web}/**`)
- `nestjs.instructions.md` — NestJS/backend (`apps/api/**`)
- `prisma.instructions.md` — ORM, isolamento de tenant e audit log (`apps/api/**`)
- `testing.instructions.md` — testes de integração com banco real (`**/*.spec.ts`)
- `docker.instructions.md` — Dockerfiles, entrypoints e Docker Compose

## Contexto do Projeto

O contexto completo vive em `mare_app_docs/` (docs do projeto):

- `mare_app_docs/context/` — regras de negócio, papéis de usuário, fluxos
- `mare_app_docs/infra/` — stack, deploy, observabilidade
- `mare_app_docs/billing/` — modelo de cobrança e estratégia Stripe
- `mare_app_docs/plan/` — escopo do MVP e decisões de arquitetura
- `mare_app_docs/adr/` — Architecture Decision Records

## Regras Críticas

1. Nunca autorizar baseado em retorno do frontend — sempre validar no NestJS.
2. Toda query mutável filtra por `account_id` — sem exceções.
3. Eventos financeiros são imutáveis — append-only, nunca atualizar.
4. Secrets nunca no repositório — Docker secrets ou env injetado.
5. Stripe webhooks: validar assinatura + idempotência antes de qualquer efeito colateral.
6. Transições de status de pedido validadas no NestJS; `cancelled` bloqueado após `confirmed`.
7. Testes de integração usam banco de dados real — sem mocks de DB.
