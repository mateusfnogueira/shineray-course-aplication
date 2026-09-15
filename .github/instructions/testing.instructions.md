---
applyTo: "**/*.{spec,test}.ts,**/__tests__/**"
---

# Testing — MareApp

## Regra fundamental

**Testes de integração usam PostgreSQL real — sem mocks de banco de dados.**

Mock de DB mascara erros de migration, incompatibilidades de tipo e violações de constraint que só aparecem em produção. Toda query deve bater no banco real.

## Tipos de teste por camada

| Tipo | O que testa | Banco? |
|------|-------------|--------|
| **Unitário** | Funções puras, transformações, lógica de domínio isolada | Não |
| **Integração** | Service + Repository + DB | Sim — PostgreSQL real |
| **E2E** | Controller → Service → DB (via supertest) | Sim — PostgreSQL real |

## Setup do banco de testes

- Banco separado para testes: `mareapp_test` (nunca usar o banco de desenvolvimento)
- Migrations aplicadas automaticamente no início da suite: `prisma migrate deploy`
- Cada teste (ou suite) trunca as tabelas necessárias — sem estado compartilhado entre testes

```typescript
// jest.setup.ts
beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE orders, comandas, memberships, accounts CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Padrão de seed por tenant

Criar dados de dois tenants distintos e validar que não há vazamento:

```typescript
it('não retorna pedidos de outro tenant', async () => {
  const accountA = await createAccount();
  const accountB = await createAccount();

  await createOrder({ accountId: accountA.id });

  // request autenticado como tenant B
  const response = await request(app.getHttpServer())
    .get('/orders')
    .set('Authorization', `Bearer ${tokenForAccount(accountB.id)}`);

  expect(response.body.data).toHaveLength(0); // tenant B não vê dados do A
});
```

## Teste obrigatório de isolamento de tenant

Todo endpoint que retorna ou modifica dados de tenant **deve ter** um teste de isolamento:

1. Cria recurso com `account_id = A`
2. Autentica como `account_id = B`
3. Tenta acessar o recurso do tenant A
4. Espera `404` ou lista vazia — **nunca** os dados do tenant A

Esse teste é pré-requisito para merge em qualquer módulo de domínio.

## Nomenclatura e organização

```
apps/api/src/
└── orders/
    ├── orders.service.ts
    ├── orders.controller.ts
    └── __tests__/
        ├── orders.service.spec.ts      # unitário (sem DB)
        └── orders.integration.spec.ts  # integração (com DB real)
```

- Arquivos unitários: `*.spec.ts`
- Arquivos de integração: `*.integration.spec.ts`
- Testes E2E: `apps/api/test/*.e2e-spec.ts`

## Factories de dados de teste

Usar factories para criar dados de forma consistente — evitar objetos literais espalhados:

```typescript
// test/factories/order.factory.ts
export function makeOrder(overrides?: Partial<Order>): Order {
  return {
    id: generateUuidV7(),
    account_id: overrides?.account_id ?? generateUuidV7(),
    status: 'criado',
    payment_status: 'pending',
    created_at: new Date(),
    ...overrides,
  };
}
```

## O que testar no unitário

Unitários sem DB apenas onde há lógica de domínio pura:

- **State machine de pedidos**: transições válidas (`criado→confirmado`) e inválidas (`confirmado→cancelado` deve lançar erro)
- **Cálculos de valor monetário**: totais de itens, desconto, arredondamento — sempre em centavos (inteiros)
- **Transformações de DTO**: formatação de resposta, mapeamento de campos
- **Lógica de expiração de comanda**: verificação de `expires_at` vs horário atual

## Padrão de teste de webhook

Todo handler de gateway (Stripe, MercadoPago, PagBank etc.) deve ter **dois testes obrigatórios**:

```typescript
it('ignora evento já processado (idempotência)', async () => {
  // processar o mesmo event_id duas vezes não deve duplicar efeito
});

it('rejeita payload com assinatura inválida', async () => {
  // deve retornar 400
});
```
