---
applyTo: "apps/api/**"
---

# Prisma — MareApp

## Isolamento de tenant via `$extends` (ADR-025)

- **Nunca usar `$use`** — API depreciada no Prisma; usar `$extends` via `PrismaService.tenant`
- O filtro de `account_id` é injetado automaticamente pelo `TenantContextService` — nunca passar `account_id` manualmente como argumento de query
- `PrismaService.tenant` retorna um client já escopado ao tenant do request atual

```typescript
// ✅ correto — tenant context já injeta account_id
const orders = await this.prisma.tenant.order.findMany({
  where: { status: 'confirmado' },
});

// ❌ errado — nunca filtrar account_id manualmente
const orders = await this.prisma.order.findMany({
  where: { account_id: tenantId, status: 'confirmado' },
});
```

## Modelos cobertos pelo filtro de tenant

Todos os modelos abaixo têm `account_id` como FK e são filtrados automaticamente:

- `orders`, `order_items`, `comandas`
- `umbrellas`, `menus`, `menu_items`
- `memberships`
- `gateway_credentials`

Modelos **não** filtrados por tenant (globais): `accounts`, `audit_log`, `stripe_events`

## `$queryRaw` — uso restrito

- Usar `$queryRaw` apenas quando o Prisma ORM não suportar a query necessária
- Todo `$queryRaw` **deve incluir** filtro `account_id` explícito na cláusula `WHERE`
- Comentário obrigatório acima da query justificando o uso de raw SQL

```typescript
// Raw necessário: GROUP BY com JSONB aggregation não suportado pelo Prisma ORM
const result = await this.prisma.$queryRaw`
  SELECT umbrella_id, COUNT(*) as total
  FROM orders
  WHERE account_id = ${accountId}   -- filtro de tenant obrigatório
  GROUP BY umbrella_id
`;
```

## IDs públicos

- Usar **UUID v7** para todos os IDs expostos externamente
- UUID v7 é ordenado por tempo — evitar IDs sequenciais (enumeração) e aleatórios puros
- No schema Prisma: `@default(dbgenerated("gen_random_uuid_v7()"))`

## Audit log — append-only

- Tabela `audit_log` é **imutável** — nunca `update` ou `delete`
- Inserir via `prisma.auditLog.create()` — nunca atualizar registro existente
- Campos obrigatórios: `account_id`, `entity`, `entity_id`, `action`, `payload` (JSONB), `created_at`
- Eventos que exigem audit: cancelamentos de pedido, estornos, transições de `payment_status`, fechamento de comanda

```typescript
// ✅ correto — sempre create, nunca update
await this.prisma.auditLog.create({
  data: {
    account_id: ctx.accountId,
    entity: 'order',
    entity_id: orderId,
    action: 'cancelled',
    payload: { reason, previous_status: order.status },
  },
});
```

## Migrations

- Nunca editar uma migration já aplicada — criar nova migration para reverter ou alterar
- Colunas nullable não geram lock de tabela em produção — preferir nullable em vez de `DEFAULT` em colunas novas
- Rodar `prisma migrate deploy` (não `dev`) em staging/produção
- Seeds em `prisma/seed.ts` — apenas para desenvolvimento; nunca rodar em produção

## Referências

- ADR-005: decisão de usar Prisma como ORM
- ADR-012: isolamento de tenant por `account_id` sem RLS
- ADR-025: padrão `AsyncLocalStorage` + `$extends` para tenant context
