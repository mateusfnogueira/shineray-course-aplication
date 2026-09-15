---
name: marketing
description: Convenções do apps/marketing — SSG puro, SEO, animações Motion, blocos Launch UI
type: skill
---

# Marketing — Landing Page Institucional

> `apps/marketing` é 100% estático (SSG). Sem auth, sem sessão, sem dados dinâmicos.
> Stack: Next.js 16 + Tailwind 4 + shadcn/ui + Motion + Launch UI blocks.
> **Mobile-first** — no Brasil ~70% do tráfego é mobile; a página é descoberta via WhatsApp, Instagram e Google Search no celular.

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

### metadataBase no layout raiz

```ts
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://mareapp.com.br'),
  title: { default: 'MareApp', template: '%s — MareApp' },
  description: 'Gestão digital para barracas de praia.',
};
```

### Metadata por página (estático)

```ts
// app/page.tsx
export const metadata: Metadata = {
  title: 'Gerencie sua barraca de praia com QR Code',
  description: 'Pedidos, cardápio e pagamento num clique. Sem app, sem mensalidade absurda.',
  openGraph: {
    title: 'MareApp — Gestão para barracas de praia',
    description: '...',
    images: [{ url: '/og/home.png', width: 1200, height: 630 }],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MareApp',
    description: '...',
    images: ['/og/home.png'],
  },
};
```

### OG Image dinâmica (build time)

```ts
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };

export default function OGImage() {
  return new ImageResponse(
    <div style={{ background: '#0f172a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: 'white', fontSize: 72 }}>MareApp</h1>
    </div>,
    { ...size }
  );
}
```

### Sitemap

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://mareapp.com.br', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://mareapp.com.br/planos', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  ];
}
```

### Robots

```ts
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: 'https://mareapp.com.br/sitemap.xml',
  };
}
```

## JSON-LD — Dados estruturados

Inserir em `app/page.tsx` como Server Component — sem `"use client"`:

```ts
// lib/structured-data.ts
export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MareApp',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: 'Plano gratuito disponível',
    },
    description: 'Sistema de gestão para barracas de praia: pedidos, cardápio e pagamento via QR Code.',
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
```

```tsx
// app/page.tsx (Server Component)
import { softwareApplicationSchema, faqSchema } from '@/lib/structured-data';

export default function HomePage() {
  const jsonLd = softwareApplicationSchema();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* seções */}
    </>
  );
}
```

> `FAQPage` aumenta visibilidade em AI search (Perplexity, ChatGPT Search, Google AI Overviews).
> Adicionar FAQ section e JSON-LD correspondente desde o início.

## Performance — regras obrigatórias

### Fontes com next/font

```ts
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});
```

Nunca importar fontes via CSS `@import url(https://fonts.googleapis.com)` — elimina DNS
round-trip e o Flash of Unstyled Text (FOUT) que causa CLS.

### Imagens com next/image

```tsx
// Hero image — acima da dobra: sempre priority
<Image src="/hero.png" alt="..." width={1200} height={800} priority sizes="(max-width: 768px) 100vw, 1200px" />

// Imagens abaixo da dobra — lazy loading padrão (sem priority)
<Image src="/feature.png" alt="..." width={600} height={400} sizes="(max-width: 768px) 100vw, 50vw" />
```

Sempre definir `width` + `height` explícitos (ou `fill` com container dimensionado) para
evitar CLS. Nunca omitir `sizes` em imagens responsivas.

### Scripts de terceiros

```tsx
// analytics, chat, etc.
import Script from 'next/script';
<Script src="https://..." strategy="lazyOnload" />
```

Nunca usar `<script>` nativo — bloqueia o main thread.

## Animações com Motion

Instalar: `motion` (já instalado em apps/marketing).

### Regra principal

Animações acima da dobra (hero, navbar) prejudicam LCP — **não animar** o que o usuário
vê imediatamente. Animar apenas elementos abaixo da dobra via scroll reveal.

### Componente AnimateOnView

```tsx
// components/ui/animate-on-view.tsx
'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

interface AnimateOnViewProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimateOnView({ children, className, delay = 0 }: AnimateOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

Uso:
```tsx
// components/sections/features.tsx (Server Component)
import { AnimateOnView } from '@/components/ui/animate-on-view';

export function Features() {
  return (
    <section>
      {features.map((feature, i) => (
        <AnimateOnView key={feature.id} delay={i * 0.1}>
          <FeatureCard {...feature} />
        </AnimateOnView>
      ))}
    </section>
  );
}
```

`AnimateOnView` é `"use client"`, mas `Features` permanece Server Component — o
`"use client"` não "contamina" o pai, apenas o wrapper de animação.

## Blocos Launch UI

Launch UI (launchuicomponents.com) provê seções de marketing prontas, MIT, compatíveis
com shadcn/ui. **Modelo copy-paste** — copiar o código da seção e adaptar ao projeto.
Não há instalação de pacote: o código entra em `components/sections/`.

Seções recomendadas para a home:
- **Hero** — título, subtítulo, CTA, screenshot do produto
- **Features** — grid de 3-6 features com ícone, título, descrição
- **How it works** — 3 passos numerados
- **Pricing** — 2-3 planos com destaque no recomendado
- **Testimonials** — depoimentos de barraqueiros
- **FAQ** — perguntas frequentes (também alimenta o FAQPage JSON-LD)
- **CTA** — chamada final com botão → `admin.mareapp.com.br/register`
- **Footer** — links, redes sociais, CNPJ

## O que NÃO fazer

- Nunca usar `cookies()`, `headers()`, `useSearchParams()` — quebra SSG
- Nunca colocar Auth.js no marketing — é página pública
- Nunca animar elementos acima da dobra — prejudica LCP e CLS
- Nunca importar fontes via CSS externo — usar `next/font`
- Nunca usar `<script>` nativo para terceiros — usar `next/script`
- Nunca importar componentes de `admin-web` ou `client-web` — zero acoplamento
- Nunca fazer layout desktop-first — começar sempre pelo mobile (375px) e expandir com `md:`, `lg:`

## Referências

- `mare_app_docs/plan/phase-1.md` — stack e configuração base do monorepo
- `mare_app_docs/adr/ADR-027-ui-strategy.md` — decisão shadcn/ui e superfícies
- `packages/ui/src/lib/utils.ts` — helper `cn()` para classes Tailwind
