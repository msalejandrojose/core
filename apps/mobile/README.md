# @core/mobile

App móvil de Core — **Ionic 8 + React 19 + Vite**, con build a iOS/Android vía
**Capacitor**. PWA por defecto; las plataformas nativas se añaden con Capacitor.

Estado: **esqueleto inicial** (login + home). El lenguaje visual sigue la skill
`core-design-system` (greige cálido + acento clay, look iOS).

## Scripts

```bash
pnpm dev:mobile      # dev server en http://localhost:4400
pnpm build:mobile    # tsc -b + vite build → apps/mobile/dist/
pnpm preview:mobile  # sirve dist/ localmente
```

## Configuración

Copia `.env.example` a `.env` y ajusta `VITE_API_URL` a la URL de la API
(`http://localhost:3000` a pelo, o `http://api.aj-local.es` con el stack local).

## Arquitectura

- `src/lib/api.ts` — wrapper `fetch` tipado contra la API. Migrará a
  `@core/api-client` cuando su schema OpenAPI esté generado (igual que el
  backoffice). **La app nunca emite eventos de workflows por su cuenta**: llama a
  endpoints de dominio de la API y es la API quien publica el evento.
- `src/store/auth.store.ts` — sesión (token + usuario) con Zustand, persistida en
  `localStorage`.
- `src/features/auth/` — login (`POST /auth/login`).
- `src/features/home/` — home protegida (`GET /auth/me`, cierre de sesión).
- `src/theme/` — tokens del design system mapeados a variables de Ionic.

Con solo dos pantallas, la navegación se resuelve por estado de sesión (sin
router). Al crecer, migrar a `@ionic/react-router`.

## Builds nativos (Capacitor)

```bash
pnpm build:mobile
pnpm --filter @core/mobile cap:add:ios      # requiere Xcode
pnpm --filter @core/mobile cap:add:android  # requiere Android SDK
pnpm --filter @core/mobile cap:sync
```

Las carpetas `ios/` y `android/` se generan y **no se versionan** (ver
`.gitignore`).
