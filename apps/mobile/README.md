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

- `src/api/client.ts` — cliente HTTP **tipado** contra el OpenAPI de `@core/api`
  (`@core/api-client` + openapi-fetch), igual que el backoffice. Inyecta el
  `Bearer` desde el auth store y cierra sesión ante un 401 con sesión activa.
  **La app nunca emite eventos de workflows por su cuenta**: llama a endpoints de
  dominio de la API y es la API quien publica el evento.
- `src/store/auth.store.ts` — sesión (token + usuario) con Zustand, persistida en
  almacenamiento seguro (`@capacitor/preferences`; `localStorage` en web) con
  auto-login diferido.
- `src/features/auth/` — login, recuperar/restablecer contraseña, verificar email.
- `src/features/home/`, `src/features/notifications/`, `src/features/settings/` —
  raíces de las pestañas del área autenticada.
- `src/app/TabsShell.tsx` — shell de navegación (IonReactRouter + IonTabs).
- `src/theme/` — tokens del design system mapeados a variables de Ionic.

> El schema tipado de `@core/api-client` (`src/generated/schema.d.ts`) está
> **gitignored**: se genera desde la API viva (o con `generate-openapi` sin DB).
> Igual que el backoffice, el build del mobile requiere generarlo antes (lo hará
> el CI en MOB-19).

## Builds nativos (Capacitor)

```bash
pnpm build:mobile
pnpm --filter @core/mobile cap:add:ios      # requiere Xcode
pnpm --filter @core/mobile cap:add:android  # requiere Android SDK
pnpm --filter @core/mobile cap:sync
```

Las carpetas `ios/` y `android/` se generan y **no se versionan** (ver
`.gitignore`).
