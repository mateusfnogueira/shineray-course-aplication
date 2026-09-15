---
mode: 'agent'
description: 'Estruturar uma nova feature do início ao fim no MareApp'
---

Estruturar uma nova feature do início ao fim no MareApp.

## Passos

1. Clarificar escopo: quais apps são afetados (admin-web, client-web, api, worker)?
2. Definir as mudanças necessárias no schema Prisma (se houver)
3. Criar o module/service/controller NestJS em `apps/api/src/<domain>/`
4. Adicionar DTOs compartilhados em `packages/types/` se a feature cruzar fronteiras de apps
5. Implementar a página/componente frontend no app Next.js correspondente
6. Adicionar testes de integração (banco real, sem mocks)
7. Atualizar docs em `mare_app_docs/context/` se a feature mudar regras de negócio ou fluxos

## Checklist antes de finalizar

- [ ] Todas as queries mutáveis filtram por `account_id`
- [ ] Auth guard aplicado nos endpoints NestJS
- [ ] Eventos financeiros são append-only, se aplicável
- [ ] Types exportados de `packages/types` para DTOs compartilhados
- [ ] Pelo menos um teste de integração cobrindo o happy path
