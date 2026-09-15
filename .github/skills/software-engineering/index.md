---
name: software-engineering
description: Princípios de engenharia de software para o MareApp — segurança, corretude, simplicidade
type: skill
---

# Engenharia de Software — MareApp

## Segurança em primeiro lugar

- Nunca confiar em input do frontend — validar tudo no NestJS com `class-validator`
- Todas as queries mutáveis de DB devem filtrar por `account_id`
- Aplicar `AuthGuard` e `RolesGuard` em todo endpoint NestJS que toca dados de tenant
- Stripe webhooks: sempre chamar `stripe.webhooks.constructEvent()` antes de processar
- Eventos financeiros: tabela append-only, nunca atualizar ou deletar

## Corretude

- Transições de status de pedido são uma state machine — enforçar na camada de service, não apenas em constraints de DB
- Usar UUIDs v7 para todos os IDs públicos (ordenados por tempo, não sequenciais)
- Testes de integração usam uma instância PostgreSQL real — sem mocks para a camada de banco
- Jobs BullMQ devem ser idempotentes — podem ser reprocessados sem efeitos colaterais duplicados

## Simplicidade

- Não adicionar abstrações para um único caso de uso
- Não over-engineetar para requisitos hipotéticos futuros
- Preferir editar código existente a criar novos arquivos
- Três linhas similares > abstração prematura
- Adicionar comentários apenas onde a lógica não é auto-evidente

## Git Workflow

- Conventional Commits: `tipo(escopo): descrição breve em inglês`
- Escopos do monorepo: `api` · `admin-web` · `client-web` · `worker` · `types` · `infra` · `billing` · `auth` · `orders` · `comandas` · `menus` · `webhooks`
- Tipos: `feat` `fix` `refactor` `test` `chore` `docs` `ci` `perf`
- Breaking changes: sufixo `!` no tipo + footer `BREAKING CHANGE:`
- Regra de tamanho: um PR por contexto de mudança — máximo 400 linhas (excluindo gerado)
- Branches: `main` (produção) · `develop` (staging) · `feature/*` · `fix/*` · `hotfix/*` · `chore/*`
- Detalhes completos: `.claude/CLAUDE.md` seção Git Workflow

## Observabilidade

- Logar nas fronteiras de service: request de entrada, response de saída, erro com contexto
- Logs estruturados JSON via `nestjs-pino` — ver `mare_app_docs/infra/logs.md` para configuração e padrões
- Jobs BullMQ logam job ID, nome da fila e tenant no início e fim
- Nunca engolir erros silenciosamente
