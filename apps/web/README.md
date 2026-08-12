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

> ⚠️ **Dos convenciones distintas conviven aquí**
>
> - Variables de **Astro/build** (`PUBLIC_*`): tu `.env` personal es el gitignored, como en cualquier proyecto Vite/Astro.
> - Config de **despliegue** (no consumida por Astro, solo por el workflow de CI): vive en `.env.local`, que aquí SÍ está committed — igual que en `apps/api`.
>
> Vite carga `.env` y luego `.env.local`, y `.env.local` **sobrescribe** claves repetidas. Por eso `.env.local` nunca lleva `PUBLIC_*`: si llevara alguna, pisaría el override que pongas en tu `.env` local. Solo lleva claves de despliegue que no cambian entre desarrolladores.

| Archivo | Contenido | Git |
|---|---|---|
| `.env.example` | Plantilla con las claves `PUBLIC_*` | Committed |
| `.env` | Tus valores locales (`PUBLIC_*`) | **Gitignored** |
| `.env.local` | Config de despliegue compartida (ej. `CLOUDFLARE_PROJECT_NAME`) | **Committed** |

Solo las variables con prefijo `PUBLIC_` se exponen al cliente (browser); van en tu `.env` local:

```bash
PUBLIC_API_URL=http://api.aj-local.es   # URL de la API (usada por el island de contacto)
PUBLIC_SITE_URL=http://www.aj-local.es  # URL del propio sitio (sitemap + OG tags)
```

`.env.local` (committed) solo lleva config de despliegue leída por `deploy-web.yml`:

```bash
CLOUDFLARE_PROJECT_NAME=core-web   # proyecto de Cloudflare Pages donde se publica dist/
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
