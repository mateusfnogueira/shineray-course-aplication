---
mode: 'agent'
description: 'Revisar todas as mudanças staged antes de commitar'
---

Revisar todas as mudanças staged antes de commitar.

## Passos

1. Executar `git diff --staged` para ver todas as mudanças staged
2. Para cada arquivo alterado:
   - Verificar problemas de segurança (injection, auth guards ausentes, secrets expostos)
   - Verificar filtro `account_id` em qualquer query Prisma
   - Verificar type safety TypeScript (sem `any`, uso correto de DTOs)
   - Verificar se eventos financeiros são append-only, se aplicável
3. Reportar problemas encontrados com referência de arquivo + linha
4. Se estiver limpo, sugerir uma mensagem de commit convencional

## Formato de saída

**Problemas encontrados:**
- `arquivo:linha` — descrição

**Mensagem de commit sugerida:**
`type(scope): descrição`
