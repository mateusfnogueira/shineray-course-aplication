---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# TypeScript — MareApp

## Modo strict sempre

- `strict: true` em todos os `tsconfig.json` — sem exceções
- Sem `any` — usar `unknown` e narrowing, ou definir um tipo adequado
- Sem type assertions (`as Foo`) a não ser que absolutamente necessário e comentado

## Types compartilhados

- DTOs compartilhados entre frontend e backend vivem em `packages/types/`
- Importar de `@mareapp/types` — nunca duplicar definições de tipos entre apps
- Types gerados pelo Prisma ficam no backend — nunca importá-los em `admin-web` ou `client-web`

## Nomenclatura

- Interfaces: `PascalCase` (ex: `CreateOrderDto`)
- Types: `PascalCase`
- Enums: `PascalCase` com valores `SCREAMING_SNAKE_CASE`
- Funções: `camelCase`
- Arquivos: `kebab-case`

## Padrões

- Preferir `readonly` em propriedades de DTOs
- Usar discriminated unions em vez de campos opcionais para variantes de estado
- Preferir tipos de retorno explícitos em funções exportadas
- `zod` para validação em runtime no frontend; `class-validator` no NestJS

## Evitar

- `Object`, `Function`, `{}` como tipos
- Estado mutável compartilhado
- Re-exportar types apenas para compatibilidade retroativa
