---
name: nestjs
description: Convenções de backend NestJS para o MareApp (modules, guards, Prisma, BullMQ)
type: skill
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
- Injetar filtro `account_id` via Prisma middleware `$use` ou `$extends` — não manualmente por query
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

**Padrão do `GlobalExceptionFilter`:**

```typescript
// apps/api/src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Erros 5xx → Sentry com contexto enriquecido
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('request_id', request['request_id']);
        scope.setUser({ id: request['user']?.id });
        scope.setExtra('account_id', request['account_id']);
        scope.setExtra('url', request.url);
        scope.setExtra('method', request.method);
        Sentry.captureException(exception);
      });
    }

    this.logger.error({
      request_id: request['request_id'],
      account_id: request['account_id'],
      status,
      method: request.method,
      url: request.url,
      error: isHttpException ? exception.message : String(exception),
    });

    response.status(status).json({
      statusCode: status,
      requestId: request['request_id'],
      message: isHttpException ? exception.getResponse() : 'Internal server error',
    });
  }
}
```

- Erros 4xx são logados mas **não** enviados ao Sentry — são erros esperados do cliente
- `request_id` sempre incluso na resposta de erro — permite correlacionar com logs no Grafana

## Logging

- Injetar `private readonly logger: Logger` de `@nestjs/common` — nunca `PinoLogger` de `nestjs-pino` diretamente nos módulos de domínio
- Instanciar apenas no construtor: `new Logger(NomeDoService.name)` — nunca inline em métodos
- Logar nas fronteiras de serviço: entrada do request, saída com `duration_ms`, e todo erro com contexto
- Sempre incluir `account_id` e `request_id` nos logs de operações de domínio
- Ver [mare_app_docs/infra/logs.md](../../mare_app_docs/infra/logs.md) para formato, redact e configuração completa
