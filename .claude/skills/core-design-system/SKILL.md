---
name: core-design-system
description: >
  Referencia y herramienta de pensamiento para el diseño / design system de las apps del monorepo
  `core` (backoffice React, web Astro, mobile Ionic). Define el "norte" estético — un lenguaje
  visual cálido, editorial y minimalista inspirado en la app de Claude (fondos greige cálidos,
  acento terracota/clay, tarjetas redondeadas, filas tipo ajustes iOS, iconografía de línea) — más
  los tokens concretos (color en oklch para Tailwind v4 + shadcn/ui, tipografía, espaciado, radios,
  elevación) y recetas de componentes. Úsala SIEMPRE que el usuario quiera pensar, definir, discutir,
  extender o auditar el diseño visual, la identidad, los colores, la tipografía, los tokens, el tema
  claro/oscuro o cualquier componente de UI de estas apps. Dispara con generosidad: "pensar el diseño",
  "qué colores usamos", "cómo debería verse esta pantalla", "monta los tokens", "esto se ve genérico",
  "hazlo más cálido", "design system", "tema oscuro", etc.
---

# Core — Design System

Esta skill es la **fuente de verdad del lenguaje visual** de las apps del monorepo `core`. No es
solo una paleta: es el criterio para decidir si una pantalla "se siente Core" o se siente a plantilla
genérica de Tailwind. Si algo aquí choca con lo que ya hay en el código, **manda el código** —
actualiza este archivo y avísale al usuario.

> Estado: **draft / en exploración**. El usuario está "pensando" el diseño. Usa esto como punto de
> partida y propón evoluciones; no lo trates como inamovible. Cuando se confirme una decisión,
> escríbela aquí.

## 0. De dónde sale esto

El norte estético se extrajo de capturas de la **app de Claude (iOS)** que al usuario le gustan. Los
colores de esta skill **no están inventados**: se muestrearon píxel a píxel de esas capturas y se
convirtieron a oklch (el formato que ya usa `apps/backoffice/src/index.css` con shadcn/ui). Ver
`references/tokens.css` para el kit listo para pegar.

## 1. El norte estético (lee esto antes de tocar nada)

Cinco palabras: **cálido, editorial, tranquilo, táctil, sin ruido.**

- **Cálido, no clínico.** Los grises tienen tinte cálido (greige, hue ~90°), nunca el zinc/slate azulado
  por defecto de shadcn. Esto es lo primero que rompe el look si lo dejas en defaults.
- **Editorial.** Aire generoso, jerarquía por tipografía y espacio antes que por cajas y bordes. Mucho
  blanco (bueno, crema). El contenido respira.
- **Tranquilo.** Un único acento (terracota/clay) usado con moderación: avatar, FAB, un punto de estado.
  El color es un evento, no el fondo. Nada de gradientes llamativos ni sombras dramáticas.
- **Táctil.** Tarjetas con radios grandes y suaves, filas agrupadas tipo Ajustes de iOS, superficies
  ligeramente elevadas sobre el fondo. Se siente como objetos físicos blandos.
- **Sin ruido.** Bordes hairline casi invisibles, sombras apenas perceptibles, iconografía de línea
  monocroma. Si dudas entre añadir o quitar, quita.

### Anti-patrones (lo que hace que se vea "a IA / a plantilla")
- ❌ Grises azulados (zinc/slate/gray de shadcn por defecto). → Usa los greige cálidos de esta skill.
- ❌ Bordes de 1px grises marcados en todas las cajas. → Hairline cálido + separación por superficie/espacio.
- ❌ Sombras `shadow-lg`/`shadow-xl` genéricas. → Elevación mínima (ver §6), casi plana.
- ❌ Acento azul/índigo "corporate SaaS" como color de marca. → El azul es solo funcional (toggles,
  selección del sistema). La **marca es clay**.
- ❌ Radios pequeños (4–8px) en tarjetas. → `rounded-2xl` (16px) para tarjetas, full para pills.
- ❌ Texto secundario en negro puro o gris frío. → `muted-foreground` greige.
- ❌ Densidad alta tipo dashboard. → Aire. Padding generoso, pocas cosas por fila.

## 2. Paleta de color

Valores muestreados de las capturas. Formato canónico **oklch** (compatible con Tailwind v4 + shadcn).
Hex incluido como referencia humana. El kit completo (light + dark, mapeado a las variables de shadcn)
está en `references/tokens.css`.

### 2.1 Superficies (modo claro)
| Rol | Hex | oklch | Uso |
|---|---|---|---|
| `background` | `#F0EFEC` | `oklch(0.952 0.004 91.4)` | Fondo de app, greige cálido |
| `card` / superficie elevada | `#F9F9F7` | `oklch(0.982 0.003 106.4)` | Tarjetas, filas agrupadas, sheets |
| superficie inset / input | `#ECEAE4` | `oklch(0.937 0.008 91.5)` | Campos inset, selects, pills inactivas |
| fila de ajustes | `#E7E6E1` | `oklch(0.924 0.007 97.4)` | Bloques de filas sobre fondo |
| blanco puro | `#FFFFFF` | `oklch(1 0 0)` | Listas a pantalla completa, hover |

### 2.2 Texto y líneas (modo claro)
| Rol | Hex | oklch | Uso |
|---|---|---|---|
| `foreground` (near-black cálido) | `#2A2A27` | `oklch(0.284 0.005 106.7)` | Texto principal. **Nunca negro puro.** |
| `muted-foreground` | `#9A968C` | `oklch(0.674 0.015 88.7)` | Cabeceras de sección, metadatos, captions |
| `border` (hairline) | `#E5E2DB` | `oklch(0.913 0.010 87.5)` | Separadores entre filas, bordes sutiles |

### 2.3 Acentos
| Rol | Hex | oklch | Uso |
|---|---|---|---|
| **clay / primary (marca)** | `#BC6A4A` | `oklch(0.610 0.114 41.7)` | Avatar, FAB, estado activo de marca, punto de notificación |
| clay deep (hover/pressed) | `#A85638` | `oklch(0.546 0.116 40.4)` | Estado pressed del primary |
| **brick / destructive** | `#A4453B` | `oklch(0.514 0.128 28.4)` | "Cerrar sesión", borrar, acciones peligrosas |
| blue / info (funcional) | `#2F6BC4` | `oklch(0.536 0.152 258.4)` | Toggles ON, selección "Sistema". **No es color de marca.** |
| purple (secundario opcional) | `#6F62D8` | `oklch(0.569 0.174 284.4)` | Avatares de iconos alternos (p. ej. iconos de tipo) |

### 2.4 Modo oscuro (oscuro **cálido**, no gris azulado)
| Rol | Hex | oklch |
|---|---|---|
| `background` | `#1C1B19` | `oklch(0.222 0.004 84.6)` |
| `card` | `#262523` | `oklch(0.265 0.004 84.6)` |
| inset / input | `#2F2E2B` | `oklch(0.301 0.005 91.6)` |
| `foreground` | `#F2F1EC` | `oklch(0.958 0.007 97.4)` |
| `muted-foreground` | `#A19D93` | `oklch(0.696 0.015 88.7)` |
| `border` | `#38362F` | `oklch(0.333 0.012 93.8)` |
| clay on dark | `#D08763` | `oklch(0.690 0.103 46.8)` |
| brick on dark | `#D9745F` | `oklch(0.669 0.131 32.9)` |
| blue on dark | `#6FA0E8` | `oklch(0.701 0.119 257.9)` |

**Regla de acento en oscuro:** sube luminosidad y baja croma (ver tabla). Un clay claro de día se
satura demasiado de noche; los valores de arriba ya están ajustados.

## 3. Tipografía

La app de Claude combina un **wordmark serif** con UI en **sans grotesca**. Replicamos esa idea:

- **Display / wordmark / títulos de marca → serif.** Da el aire editorial. Sugerencia open-source:
  **Fraunces** o **Lora** (variable). Solo para el logotipo y, opcionalmente, títulos de pantalla grandes.
- **UI / cuerpo → sans grotesca neutra.** Sugerencia: **Inter** (o `system-ui` como fallback inmediato,
  que en iOS da SF y mantiene el look nativo de las capturas). Sin personalidad agresiva.
- **Numérico / mono → opcional**, solo para datos técnicos (tokens, IDs). `ui-monospace`.

### Escala (base 16px / 1rem)
| Token | px | uso |
|---|---|---|
| `text-xs` | 12 | metadatos, timestamps ("ahora", "1h") |
| `text-sm` | 14 | cuerpo secundario, descripciones de fila |
| `text-base` | 16 | cuerpo, etiqueta de fila |
| `text-lg` | 18 | título de pantalla (header centrado) |
| `text-2xl` | 24 | títulos de sección grandes |
| `text-4xl` | 34 | wordmark / display serif |

**Pesos:** cuerpo `400`, etiquetas de fila `450–500`, títulos `500–600`. Nada de `700+` salvo el wordmark.
**Cabeceras de sección** ("App", "Apariencia", "Cuenta", "Hoy"): `text-sm`, peso `400`, color
`muted-foreground`, **sin mayúsculas** (capitalización normal), buen `tracking` neutro.

## 4. Espaciado y layout

- **Unidad base 4px.** Usa la escala de Tailwind tal cual.
- **Padding de tarjeta/fila:** 16px (`p-4`) horizontal, 14–16px vertical. Generoso.
- **Gap entre tarjetas agrupadas:** las filas de un mismo grupo van pegadas con separador hairline;
  **entre grupos** distintos, 24–32px (`gap-6`/`gap-8`) + cabecera de sección.
- **Margen de pantalla (mobile):** 16px (`px-4`) a los lados.
- **Header de pantalla:** título centrado, acciones a los lados (X / atrás a la izquierda, info/menú a
  la derecha), altura cómoda. Estilo iOS.
- **Listas:** una acción/objeto por fila, chevron `>` a la derecha para navegación, icono de línea a la
  izquierda. Respira: no metas 3 metadatos en una fila.

## 5. Radios

| Token | px | uso |
|---|---|---|
| `rounded-lg` | 10 | inputs, botones pequeños |
| `rounded-xl` | 14 | botones, campos inset |
| `rounded-2xl` | 16 | **tarjetas y bloques de filas (default)** |
| `rounded-3xl` | 24 | sheets / cards grandes destacadas (p. ej. card "Suave" del selector de voz) |
| `rounded-full` | — | pills, segmented control, FAB, avatares, toggles |

`--radius` base recomendado: **`1rem` (16px)** — más redondo que el `0.625rem` actual del backoffice.
Súbelo cuando adoptemos este DS.

## 6. Elevación (sombras)

Casi plano. La jerarquía la dan **superficie + radio**, no la sombra.
- **Nivel 0 — en fondo:** sin sombra. Las filas agrupadas se distinguen por ser `card` sobre `background`.
- **Nivel 1 — tarjeta:** sombra apenas perceptible:
  `box-shadow: 0 1px 2px oklch(0 0 0 / 0.04), 0 1px 1px oklch(0 0 0 / 0.03);`
- **Nivel 2 — flotante (FAB, sheet, popover):**
  `box-shadow: 0 8px 24px oklch(0 0 0 / 0.10), 0 2px 6px oklch(0 0 0 / 0.06);`

Prohibido `shadow-lg`/`shadow-xl` de Tailwind directos: son demasiado azules y duros para este look.

## 7. Iconografía

- **Estilo línea / outline, monocromo, stroke ~1.5–2px.** Coincide con `lucide-react`, que ya está en
  el backoffice (`iconLibrary: lucide` en `components.json`). **Usa lucide.**
- Tamaño en fila: 20–22px. Color: `foreground` al ~80% o `muted-foreground` según jerarquía.
- Iconos de avatar/categoría pueden ir dentro de un cuadrado redondeado con tinte suave (clay/purple
  al ~12% de opacidad de fondo + icono al color pleno) — ver fila de tipo en la captura de lista.

## 8. Componentes (patrones)

Recetas concretas (JSX + Tailwind para el stack shadcn del repo) en **`references/patterns.md`**:
filas de ajustes agrupadas, segmented control tipo pill, FAB, selector de tema (Claro/Oscuro/Sistema),
tarjetas de lista, toggle, header de pantalla. Cuando montes UI nueva, **parte de esas recetas** antes
de inventar.

## 9. Cómo aplicar esto al código (Tailwind v4 + shadcn)

El backoffice (`apps/backoffice`) usa shadcn/ui "new-york" con tokens oklch en
`src/index.css` y `baseColor: zinc`. Para adoptar este DS:

1. **Sustituye el bloque `:root` y `.dark`** de `apps/backoffice/src/index.css` por el de
   `references/tokens.css` (mismos nombres de variable shadcn → cero cambios en componentes).
2. Sube `--radius` a `1rem`.
3. Añade las fuentes (serif display + sans UI) y mapea `--font-serif` / `--font-sans` en `@theme`.
4. **No** toques `components.json` salvo para confirmar `iconLibrary: lucide`.
5. Verifica contraste AA del texto sobre superficies (el `foreground` near-black sobre greige pasa de sobra).

> **Importante:** esta skill es de *pensamiento/diseño*. **No** reescribas `index.css` ni toques el
> código de las apps a menos que el usuario lo pida explícitamente. Por defecto, propón y razona.

## 10. Proceso para evolucionar el DS

Cuando el usuario quiera "pensar" una pantalla o un cambio:
1. Anclar en el norte (§1) — ¿se siente cálido/editorial/tranquilo?
2. Reutilizar tokens (§2–7) antes de introducir valores nuevos. Si hace falta un token nuevo, nómbralo
   semánticamente y añádelo a la tabla + `tokens.css`.
3. Partir de un patrón existente (§8) antes de inventar componente.
4. Pasar el filtro anti-patrones (§1).
5. Si se decide algo, **escribirlo aquí** (esta skill es viva).

Para explorar visualmente (mockups, boards de identidad, comps de pantalla) puedes apoyarte en las
skills de imagen del repo (`imagegen-frontend-mobile`, `brandkit`) usando esta paleta y este norte como
brief.
