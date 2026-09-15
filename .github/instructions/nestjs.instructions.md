---
applyTo: "apps/api/**"
---

# NestJS — MareApp

## Estrutura de módulos

- Um módulo por domínio: `auth`, `orders`, `comandas`, `menus`, `billing`, `notifications`, `webhooks`
- Pasta do módulo: `apps/api/src/<domain>/`
- Arquivos por domínio: `<domain>.module.ts`, `<domain>.service.ts`, `<domain>.controller.ts`, `<domain>.repository.ts` (opcional)

## Guards

- `AuthGuard` em todos os endpoints que exigem sessão
- `RolesGuard` em endpoints restritos por papel (owner, staff, etc.)
- Nunca pular guards baseado em claim do frontend — sempre validar no guard

## Prisma

- Todas as queries passam pelo Prisma service — sem SQL raw exceto em migrations
- Injetar filtro `account_id` via `PrismaService.tenant` (ver `prisma.instructions.md`)
- Nunca expor types Prisma para o frontend — mapear para DTOs na camada de service

## BullMQ

- Uma fila por domínio: `menu-publish`, `notifications`, `billing-reconcile`
- Todos os jobs devem ser idempotentes
- Configurar DLQ com retry de exponential backoff
- Logar `jobId`, `queue` e `accountId` no início e fim de cada job

## Validação

- Todos os payloads recebidos validados com `class-validator` + `class-transformer`
- Usar `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`
- Retornar 400 com erros por campo — nunca 500 por falha de validação

## Tratamento de erros

- Lançar exceções nativas do NestJS (`NotFoundException`, `ForbiddenException`, etc.)
- Nunca expor detalhes internos de erro (stack traces) para o cliente em produção
- O `GlobalExceptionFilter` é o único lugar que chama `Sentry.captureException()` — não chamar nos services
- Erros 4xx são logados mas **não** enviados ao Sentry — são erros esperados do cliente
- `request_id` sempre incluso na resposta de erro — permite correlacionar com logs no Grafana

## Logging

- Injetar `private readonly logger: Logger` de `@nestjs/common`
- Instanciar apenas no construtor: `new Logger(NomeDoService.name)`
- Logar nas fronteiras de serviço: entrada do request, saída com `duration_ms`, e todo erro com contexto
- Sempre incluir `account_id` e `request_id` nos logs de operações de domínio
