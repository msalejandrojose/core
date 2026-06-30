# apps/web — Sitio público estático (Astro)

Web pública del monorepo Core. Sitio estático generado con **Astro 5** (SSG), **Tailwind 4** y **React** para islands interactivos.

## Scripts

```bash
pnpm dev:web          # dev server en localhost:4321 (desde la raíz)
pnpm build:web        # type-check + build estático → apps/web/dist/
pnpm preview:web      # sirve el build localmente

# O desde apps/web/ directamente:
pnpm dev              # dev server
pnpm build            # astro check + astro build
pnpm preview          # preview del build
pnpm check            # solo type-check (astro check)
```

## Variables de entorno

> ⚠️ **Convención diferente a `apps/api/`**
>
> Aquí `.env.local` está **gitignored** (convención Vite/Astro). En la API, `.env.local` está committed como defaults del equipo. No confundir.

| Archivo | Contenido | Git |
|---|---|---|
| `.env.example` | Plantilla con todas las claves | Committed |
| `.env.local` | Valores locales por defecto | **Gitignored** |
| `.env` | Overrides locales / secretos | **Gitignored** |

Solo las variables con prefijo `PUBLIC_` se exponen al cliente (browser):

```bash
PUBLIC_API_URL=http://api.aj-local.es   # URL de la API (usada por el island de contacto)
PUBLIC_SITE_URL=http://www.aj-local.es  # URL del propio sitio (sitemap + OG tags)
```

## Stack local con run.sh

```bash
./run.sh web             # levanta MySQL + Caddy; la web corre en el host
./run.sh --setup-hosts   # añade www.aj-local.es a /etc/hosts (una sola vez)
```

Caddy enruta `http://www.aj-local.es` → `host.docker.internal:4321` (dev server de Astro).

## Diseño

- **Paleta**: greige cálido (fondos) + terracota/clay (acento de marca)
- **Tipografía**: Fraunces Variable (display/headings) + Inter Variable (cuerpo)
- **Dark mode**: respeta `prefers-color-scheme`; se puede forzar con `data-theme="dark"` en `<html>` (guardado en `localStorage`)
- **Tokens**: definidos en `@theme` (Tailwind 4) dentro de `src/styles/globals.css`. Overrides de dark mode en `src/styles/tokens.css`.

## Estructura

```
src/
├── components/
│   ├── Seo.astro              # OG + Twitter cards
│   ├── ui/                    # Button, Container, Link
│   ├── sections/              # Header, Footer, Hero
│   └── islands/               # ContactForm.tsx (React, client:load)
├── layouts/
│   ├── BaseLayout.astro       # html + head + anti-flash theme script
│   └── MarketingLayout.astro  # Header + Footer + slot
├── pages/
│   ├── index.astro            # Home
│   ├── contacto.astro         # Formulario (smoke test CORS → API)
│   └── 404.astro
├── lib/
│   ├── api.ts                 # Wrapper fetch → PUBLIC_API_URL
│   └── seo.ts                 # Helper buildSeoMeta
├── styles/
│   ├── globals.css            # @import tailwindcss + @theme + base layer
│   └── tokens.css             # Dark mode CSS var overrides
└── content/
    └── config.ts              # Content collections (preparado, vacío)
```

## i18n

La estructura está preparada para `es` (default) y `en`. Cuando haya contenido real, descomentar el bloque `i18n` en `astro.config.mjs`.
