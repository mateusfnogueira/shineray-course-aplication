---
applyTo: "apps/marketing/**"
---

# Marketing — Landing Page Institucional

> `apps/marketing` é 100% estático (SSG). Sem auth, sem sessão, sem dados dinâmicos.
> Stack: Next.js + Tailwind + shadcn/ui + Motion + Launch UI blocks.
> **Mobile-first** — no Brasil ~70% do tráfego é mobile.

## Rendering — SSG forçado

Todo `page.tsx` do marketing deve exportar:

```ts
export const dynamic = 'force-static';
```

Isso garante SSG mesmo que um componente filho acidentalmente leia cookies ou headers.
Nunca usar `getServerSideProps`, `cookies()`, `headers()` ou `useSearchParams()` no marketing.

## Estrutura de pastas

```
apps/marketing/
├── app/
│   ├── layout.tsx           # fonte, globals.css, metadataBase
│   ├── page.tsx             # home: Hero + Features + Pricing + Testimonials + CTA + Footer
│   ├── sitemap.ts           # todas as rotas — gerado em build time
│   ├── robots.ts
│   └── opengraph-image.tsx  # imagem OG dinâmica gerada em build time
├── components/
│   ├── sections/            # Hero, Features, Pricing, Testimonials, CTA, Footer, Navbar
│   └── ui/                  # AnimateOnView, wrappers de motion, card-marketing
└── lib/
    └── structured-data.ts   # helpers para JSON-LD
```

Componentes de seção ficam em `components/sections/` — nunca misturar com `packages/ui`
porque são exclusivos do marketing (texto, layout e copy são específicos do produto).

## SEO — Metadata API

- Usar `metadataBase` no layout raiz com a URL de produção
- Cada página exporta `metadata` ou `generateMetadata` com `title`, `description` e `openGraph`
- Structured data via JSON-LD em `lib/structured-data.ts` — `WebSite`, `Organization`, `Product`
- Usar `next/image` com `priority` para imagens above the fold

## Estilização

- Tailwind CSS apenas — sem CSS modules, sem inline styles
- Mobile-first: projetar para telas menores e escalar para desktop
- `min-h-[48px]` em todos os elementos tocáveis (acessibilidade)
