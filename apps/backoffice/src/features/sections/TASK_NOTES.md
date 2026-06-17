# Notas — TASK-48 / BO-07

## Estado

Frontend del sidebar dinámico implementado siguiendo
`apps/backoffice/docs/specs/07-sidebar-dinamico.md`.

## Dependencias pendientes

Este PR adelanta el frontend, pero **no funciona end-to-end** hasta que
estén completadas:

1. **BO-01 (TASK-42)** — Scaffold del backoffice con Vite + React 19,
   `@/api/client`, `@/components/ui/skeleton` (shadcn), `@/lib/utils`,
   alias `@/`, Tailwind, providers.
2. **BO-03** — Layouts (`AppLayout` con sidebar hardcoded a reemplazar).
3. **TASK-38** — Módulo backend `sections` con `GET /sections/tree`.
4. **TASK-24 (regen)** — Regenerar `@core/api-client` para incluir el
   endpoint `/sections/tree` tras TASK-38.

## Decisiones tomadas

- Tipos publicados como entrega mínima en `packages/sections/src/index.ts`
  (`SectionScope`, `SectionTreeNode`). Permite tipar el consumidor sin
  esperar al package completo. El resto del package (modelo Prisma,
  módulo backend, helpers `defineSection`, `walkTree`) se entrega con TASK-38.
- Mapa de iconos estático (no dynamic import) — mejor tree-shaking y
  errores tipados si se referencia un icono inexistente.
- `useSectionTree` con `staleTime: 5min` según spec.
- Fallback `Circle` para iconos no registrados — evita crash de render
  si una sección referencia un icono no incluido en el mapa.
