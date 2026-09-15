---
applyTo: "apps/{admin-web,client-web}/**"
---

# React / Next.js — MareApp

> Esta instrução cobre `admin-web` e `client-web`.
> Para `apps/marketing` (landing page institucional), ver `marketing.instructions.md`.

## Convenções do App Router

- Preferir React Server Components (RSC) por padrão — só adicionar `"use client"` quando necessário
- Busca de dados em Server Components — nunca `useEffect` para dados iniciais
- Usar `cache()` e `revalidateTag()` do Next.js para ISR no `client-web`
- `loading.tsx` e `error.tsx` para cada segmento de rota que busca dados

## Especificidades do `admin-web`

- Auth via Auth.js — sempre verificar sessão em Server Components com `getServerSession()`
- Atualizações de pedidos em tempo real via SSE (`EventSource`) — reconexão automática pelo browser, sem código manual (ver ADR-015)
- Nunca renderizar UI restrita por papel baseado apenas em estado do cliente — revalidar sessão no servidor

## Especificidades do `client-web`

- Páginas de cardápio são SSG/ISR — sem auth, sem sessão
- Estado do carrinho é client-side apenas (localStorage ou zustand)
- Envio de pedido acessa a API diretamente — mostrar UI otimista com rollback em erro

## Componentes — shadcn/ui

- Primitivos base instalados em `packages/ui/components/` — compartilhados entre apps
- Componentes exclusivos de um app ficam em `apps/<app>/components/` — nunca mover para `packages/ui` se só um app usa
- Componentes pesados (DataTable, Command) ficam no app que usa — não entram em `packages/ui`
- Usar `cn()` de `lib/utils.ts` para classes condicionais:

```typescript
import { cn } from '@/lib/utils'
<Button className={cn('w-full', isLoading && 'opacity-50')} />
```

- Tema via CSS variables em `globals.css` de cada app — não sobrescrever tokens diretamente
- Mobile-first, contraste alto, `min-h-[48px]` em elementos tocáveis

## Estilização

- Tailwind CSS apenas — sem CSS modules, sem inline styles

## Padrões

- Co-locar componentes com sua rota quando usados em apenas um lugar dentro do app
- Sem prop drilling além de 2 níveis — usar context ou props passadas pelo servidor
- Formulários: `react-hook-form` + `zod` para validação no cliente
