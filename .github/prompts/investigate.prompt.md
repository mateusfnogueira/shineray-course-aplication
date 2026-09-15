---
mode: 'ask'
description: 'Investigar um bug ou comportamento inesperado no MareApp'
---

Investigar um bug ou comportamento inesperado no MareApp.

## Passos

1. Ler os arquivos relevantes com base no problema relatado
2. Verificar o módulo de domínio em `apps/api/src/` relacionado ao problema
3. Verificar se o filtro `account_id` está correto em todas as queries envolvidas
4. Checar se há jobs relacionados nas filas BullMQ
5. Analisar o schema Prisma em busca de problemas no modelo de dados
6. Reportar: causa raiz, arquivos afetados, correção proposta e se os testes cobrem esse caminho

## Formato de saída

**Causa raiz:** ...
**Arquivos afetados:** ...
**Correção:** ...
**Lacuna de cobertura de testes:** ...
