---
name: core-web-template
description: >
  Crea una nueva plantilla de landing page para el sitio Astro en apps/web. Úsala
  siempre que el usuario quiera añadir, probar o scaffoldear una nueva plantilla
  visual, diseño de landing, o variante de página en el sitio web estático. Aplica
  cuando mencione "nueva plantilla", "nueva landing", "añadir al selector", "quiero
  probar otro diseño", o describa un estilo visual nuevo que quiere implementar en
  la web.
---

# Nueva plantilla — Core Web (Astro)

## Sistema de plantillas

El sitio vive en `apps/web/`. Las plantillas siguen este patrón:

```
apps/web/src/
├── pages/
│   ├── index.astro              ← selector (añadir entrada aquí)
│   └── templates/
│       ├── sazon.astro          ← plantilla existente
│       ├── marketing.astro      ← plantilla existente
│       └── <nueva>.astro        ← CREAR aquí
├── layouts/
│   ├── SazonLayout.astro        ← cada plantilla puede tener su propio layout
│   └── MarketingLayout.astro
├── styles/
│   ├── sazon.css                ← cada layout importa su CSS propio
│   └── globals.css              ← tokens base (greige + terracota)
└── components/
    ├── sazon/                   ← componentes de cada plantilla agrupados
    └── sections/                ← componentes genéricos reutilizables
```

`DevTemplateBadge` es un badge flotante que aparece solo en dev (`import.meta.env.DEV`)
y lleva de vuelta al selector (`/`). Hay que incluirlo en todas las plantillas.

## Proceso

### 1. Recopilar metadatos

Antes de crear nada, reúne esta información (infiere lo que puedas del contexto del usuario, confirma solo lo ambiguo):

| Campo | Para qué sirve | Ejemplo |
|---|---|---|
| `id` | slug en la URL y directorio de componentes | `minimal`, `agencia` |
| `name` | Nombre visible en el selector | `Minimal`, `Agencia` |
| `tagline` | Una línea describiendo el caso de uso | `Landing oscura para SaaS B2B` |
| `mood` | 2-3 adjetivos que describen el tono visual | `Oscuro · Minimalista · Técnico` |
| `palette` | 4-5 colores hex u oklch que definen el sistema visual | `['#0A0A0A', '#F5F5F5', ...]` |
| `sections` | Lista de secciones que tendrá la plantilla | `['Hero', 'Features', 'Pricing', 'CTA']` |
| `font` | Tipografías que se usarán | `Inter + Geist Mono` |

### 2. Decidir arquitectura

Hay dos casos según la complejidad del diseño:

**A) Plantilla ligera** — reutiliza `BaseLayout` o `MarketingLayout`, sin CSS propio.
Adecuada para prototipos rápidos o plantillas que comparten el sistema visual base.

**B) Plantilla con identidad propia** — crea layout + CSS propios.
Adecuada cuando la plantilla tiene paleta, tipografía o estructura radicalmente diferente.

Sugiere la opción correcta según lo que el usuario describe. La plantilla Sazón es un buen
ejemplo de (B); la Marketing es un ejemplo de (A).

### 3. Crear los archivos

#### Para plantilla con identidad propia (caso B):

**`apps/web/src/styles/<id>.css`**
```css
@import "tailwindcss";

@theme {
  /* Define tokens de color específicos de esta plantilla */
  --color-<id>-bg: <color>;
  --color-<id>-fg: <color>;
  /* etc. */

  /* Fuentes si son distintas a las base */
  --font-<id>: "<Nombre>", system-ui, sans-serif;
}

@layer base {
  body {
    font-family: var(--font-<id>);
    background: var(--color-<id>-bg);
    color: var(--color-<id>-fg);
  }
}
```

**`apps/web/src/layouts/<Name>Layout.astro`**
```astro
---
import '../styles/<id>.css';

interface Props {
  title?: string;
  description?: string;
}
const { title = '<Título por defecto>', description = '<Descripción>' } = Astro.props;
---
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <!-- Añade Google Fonts u otras fuentes si la plantilla las necesita -->
</head>
<body>
  <slot />
</body>
</html>
```

#### Componentes de sección

Crea cada sección en `apps/web/src/components/<id>/`. Nombra los archivos por su rol
(`Hero.astro`, `Features.astro`, etc.). Implementa el contenido con datos de ejemplo
realistas — no lorem ipsum. El código debe compilar y verse bien desde el primer render.

Si el usuario no ha especificado el contenido exacto, inventa copy coherente con el
`tagline` y el `mood` de la plantilla. El objetivo es que el usuario vea algo concreto,
no un esqueleto vacío.

#### La página de la plantilla

**`apps/web/src/pages/templates/<id>.astro`**
```astro
---
import <Name>Layout from '../../layouts/<Name>Layout.astro';
import Hero from '../../components/<id>/Hero.astro';
// ... resto de secciones
import DevTemplateBadge from '../../components/DevTemplateBadge.astro';
---
<<Name>Layout>
  <DevTemplateBadge name="<Name>" />
  <main>
    <Hero />
    <!-- resto de secciones -->
  </main>
</<Name>Layout>
```

### 4. Registrar en el selector

Abre `apps/web/src/pages/index.astro` y añade una entrada al array `templates`:

```js
{
  id: '<id>',
  href: '/templates/<id>',
  name: '<Name>',
  tagline: '<tagline>',
  palette: ['<color1>', '<color2>', '<color3>', '<color4>', '<color5>'],
  sections: ['<Sección 1>', '<Sección 2>'],
  font: '<Font display> + <Font body>',
  mood: '<Adjetivo> · <Adjetivo> · <Adjetivo>',
},
```

Los colores de `palette` se renderizan como círculos en el selector. Usa los mismos
valores que defines en el CSS de la plantilla para que sean visualmente coherentes.

### 5. Verificar

Después de crear todos los archivos, ejecuta:

```bash
pnpm --filter @core/web exec astro check
```

Cero errores es el requisito mínimo. Si hay warnings sobre `is:inline` en scripts de
JSON-LD, son preexistentes y se pueden ignorar.

## Regla crítica: no reescribir infraestructura existente

Cuando el usuario pide añadir una plantilla, el objetivo es **añadir**, no refactorizar.
Antes de crear cualquier archivo, comprueba si ya existe. En concreto:

- `DevTemplateBadge.astro` — probablemente ya existe; no lo reescribas
- `src/pages/index.astro` — ya es el selector; solo **edita** el array `templates`
- Las otras plantillas (`sazon.astro`, `marketing.astro`, etc.) — no las toques

Si el archivo existe, edita solo lo necesario (añadir la entrada al array `templates`).
Si no existe, créalo desde cero.

## Notas del sistema

- `DevTemplateBadge` está en `apps/web/src/components/DevTemplateBadge.astro`.
  Solo se renderiza cuando `import.meta.env.DEV === true`.
- No añadas `noindex` a las páginas de plantilla — en producción el selector no existirá
  y cada plantilla se desplegará como el `index.astro` real del proyecto correspondiente.
- Los tokens base de `globals.css` (greige, terracota, Fraunces + Inter) están disponibles
  en cualquier plantilla que importe `globals.css`. Si la plantilla los necesita, puede
  importar `globals.css` directamente en su layout en lugar de crear un CSS propio.
- Si la plantilla usa fuentes de Google Fonts, añade los `<link>` de preconnect en el
  `<head>` del layout de la plantilla, como hace `SazonLayout.astro`.
