---
name: code-review-mareapp
description: Skill unificada de code review para PRs do MareApp — processo em 4 passes com checklists por domínio, severidade P0–P3 e output estruturado
type: skill
---

# Revisão de Código — MareApp

## Visão geral do processo

A revisão segue 4 passes sequenciais com foco progressivo. Tempo total estimado: **8–12 min** para PRs de até 400 linhas. PRs maiores devem ser divididos antes de entrar em review.

| Pass   | Foco                   | Tempo estimado |
| ------ | ---------------------- | -------------- |
| Pass 0 | Contexto e escopo      | 1 min          |
| Pass 1 | Estrutura e design     | 2 min          |
| Pass 2 | Corretude e testes     | 3–4 min        |
| Pass 3 | Segurança e compliance | 2 min          |

---

## Sistema de severidade

| Label  | Significado                                                                     | Ação                                                |
| ------ | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `[P0]` | Bloqueante crítico — risco de segurança, perda de dados ou quebra de produção   | Não faz merge. Requer correção e novo review.       |
| `[P1]` | Bloqueante — bug confirmado, violação de contrato ou regressão de comportamento | Não faz merge. Correção obrigatória antes do merge. |
| `[P2]` | Sugestão — melhoria de legibilidade, design alternativo ou cobertura de testes  | Discussão bem-vinda. Autor decide.                  |
| `[P3]` | Nit — estilo menor, preferência pessoal                                         | Totalmente opcional. Autor não precisa responder.   |

**Exemplos de comentário por severidade:**

```
[P0] src/webhooks/stripe.controller.ts:42
A assinatura do webhook não está sendo validada antes de processar o evento.
Qualquer payload pode acionar cobranças. Usar `stripe.webhooks.constructEvent()` antes de qualquer lógica.

[P1] src/orders/orders.service.ts:118
A transição de `PENDING` para `SHIPPED` não passa pela state machine — chama diretamente o repositório.
Isso bypass a validação de estoque e pode gerar pedidos inconsistentes.

[P2] src/users/users.service.ts:77
Poderia extrair a lógica de formatação de endereço para um método separado.
Facilita reutilização e testes unitários isolados.

[P3] src/auth/auth.module.ts:12
Prefiro importações em ordem alfabética, mas não é bloqueante.
```

---

## Pass 0 — Contexto e escopo (1 min)

Antes de ler código, entender o propósito do PR.

- [ ] A descrição do PR explica **o quê** e **o porquê** da mudança?
- [ ] O escopo é razoável? PRs com mais de 400 linhas (excluindo gerado) devem ser divididos.
- [ ] Existe breaking change? Se sim: está versionado, comunicado e com migration path?
- [ ] Migrations de banco de dados presentes? Verificar reversibilidade e impacto em produção.
- [ ] O PR está vinculado a uma issue ou ticket?

---

## Pass 1 — Estrutura e design (2 min)

### Arquitetura

- [ ] A solução segue os padrões do MareApp (Controller → Service → Repository)?
- [ ] Responsabilidades bem delimitadas — sem lógica de negócio no Controller?
- [ ] Nenhuma abstração criada para um único caso de uso — YAGNI aplicado?
- [ ] Nenhum tipo Prisma vazando para além da camada de Service?

### Contratos e tipos compartilhados

- [ ] DTOs novos ou alterados usam `packages/types` — sem duplicação entre apps?
- [ ] Respostas de API seguem o formato padrão do projeto?
- [ ] Eventos do BullMQ têm tipagem explícita em `packages/types`?

### TypeScript

- [ ] Nenhum tipo `any` introduzido sem justificativa em comentário?
- [ ] Strict null checks respeitados — sem `!` non-null assertions sem comentário explicativo?
- [ ] Funções exportadas têm tipos de retorno explícitos?
- [ ] Nenhuma importação de tipos de runtime onde só o tipo é necessário (`import type`)?

### Legibilidade

- [ ] Nomenclatura clara e consistente com o restante do codebase?
- [ ] Comentários apenas onde a lógica não é auto-explicativa?
- [ ] Nenhum código morto ou comentado deixado para trás?

---

## Pass 2 — Corretude e testes (3–4 min)

### Lógica de negócio

- [ ] Transições de status de pedido passam pela state machine da camada de Service?
- [ ] Edge cases cobertos: valores nulos, arrays vazios, usuário sem permissão, dados corrompidos?
- [ ] Jobs BullMQ são idempotentes — processamento duplicado é seguro?
- [ ] Operações assíncronas têm tratamento de erro explícito?

### Performance

- [ ] Nenhuma query N+1 introduzida (Prisma: verificar ausência de `findMany` dentro de loops)?
- [ ] Queries pesadas têm índices adequados ou estão protegidas por paginação?
- [ ] Nenhum carregamento desnecessário de dados — `select` com campos explícitos onde possível?

### Testes

Severidade por lacuna de cobertura:

| Lacuna | Severidade |
|--------|-----------|
| Webhook handler sem teste de idempotência ou assinatura inválida | `[P0]` |
| Endpoint de domínio sem teste de isolamento de tenant | `[P0]` |
| Lógica de state machine sem teste de transição inválida | `[P1]` |
| Novo módulo de domínio sem nenhum teste de integração | `[P1]` |
| Caminho de erro não testado em endpoint existente | `[P2]` |

- [ ] Webhooks têm teste de idempotência (mesmo event_id não duplica efeito)?
- [ ] Webhooks têm teste de rejeição por assinatura inválida (esperado: 400)?
- [ ] Todo endpoint de domínio novo tem teste de isolamento de tenant?
- [ ] Lógica de state machine tem testes de transição válida e inválida?
- [ ] Casos de erro e edge cases testados, não só o happy path?
- [ ] Testes de integração usam banco real — sem `jest.mock()` para DB?

---

## Pass 3 — Segurança e compliance (2 min)

### Autenticação e autorização

- [ ] Todos os endpoints NestJS têm `@UseGuards(AuthGuard)` aplicado?
- [ ] Rotas restritas por papel têm `@UseGuards(RolesGuard)` com o decorator correto?
- [ ] Nenhum endpoint exposto acidentalmente sem guard?

### Isolamento de dados (multi-tenant)

- [ ] Toda query Prisma mutável filtra por `account_id` do usuário autenticado?
- [ ] Nenhuma query que possa retornar dados de outra conta por manipulação de ID?

### Dados sensíveis

- [ ] Nenhum secret, credencial, API key ou PII no diff?
- [ ] Variáveis de ambiente usadas corretamente via `ConfigService`?
- [ ] Logs não expõem dados sensíveis?

### Financeiro e auditoria

- [ ] Handler de webhook Stripe valida assinatura com `stripe.webhooks.constructEvent()` antes de processar?
- [ ] Eventos financeiros são append-only — nenhum `UPDATE` ou `DELETE` nas tabelas de audit?
- [ ] Valores monetários em centavos (inteiros) — sem `float` em cálculos financeiros?

### Validação de inputs

- [ ] DTOs têm decorators de validação (`class-validator`) em todos os campos?
- [ ] Uploads de arquivo têm validação de tipo e tamanho?
- [ ] Queries de busca têm sanitização ou escapamento adequado?

---

## Output do review

### Veredito

| Status                        | Critério                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 🟢 **Aprovado**               | Nenhum P0 ou P1. P2/P3 opcionais respondidos ou ignorados pelo autor.                                           |
| 🟡 **Aprovado com ressalvas** | Nenhum P0. Um ou mais P1 identificados — merge após correção sem re-review obrigatório (a critério do revisor). |
| 🔴 **Requer mudanças**        | Um ou mais P0 presentes. Re-review obrigatório após correção.                                                   |

### Estrutura do relatório

```
## Review — [Nome do PR / Branch]

### 🟢🟡🔴 Veredito: [status]

### ✅ Destaques
- [Algo bem feito — obrigatório mencionar ao menos um ponto positivo]
- [...]

### Issues

[P0] arquivo:linha — Título breve
Descrição do problema e impacto. Sugestão de correção quando possível.

[P1] arquivo:linha — Título breve
...

[P2] arquivo:linha — Título breve
...

[P3] arquivo:linha — Título breve
...

### Resumo
[1–2 frases sobre o PR no geral e próximos passos]
```

---

## Tom da revisão

- Ser **específico**: citar arquivo e linha em todo issue.
- Revisar o **código**, não o autor — linguagem neutra e técnica.
- **Elogios são obrigatórios** — identificar ao menos um ponto forte genuíno por PR. Reviews puramente negativos criam resistência ao processo.
- P2 e P3 são sugestões, não ordens — usar linguagem como "considerar", "poderia", "preferência".
- P0 e P1 devem incluir o **impacto** do problema, não só a ocorrência.
