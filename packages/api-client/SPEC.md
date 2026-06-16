# Spec: @core/api-client — cliente TypeScript generado desde el OpenAPI

> **Estado:** draft
> **Tarea:** TASK-24

## Objetivo

Package `@core/api-client` que expone un cliente HTTP completamente tipado, generado a partir del
schema OpenAPI de `@core/api`. Lo consumen `apps/backoffice`, `apps/web` y `apps/mobile`.

El package es **agnóstico de framework**: no acopla React, Vue ni nada específico de plataforma.
El manejo de caché y estado del servidor (React Query, SWR, etc.) es responsabilidad de cada app.

## Herramienta elegida: openapi-typescript + openapi-fetch

| Herramienta | Por qué |
|---|---|
| `openapi-typescript` | Genera el schema TypeScript desde `/docs-json`. Sin código generado en tiempo de ejecución — solo tipos. Árbol de dependencias limpio. |
| `openapi-fetch` | Cliente fetch tipado sobre el schema generado. ~2 KB, sin dependencias. Type inference exacta de params, body y respuesta por ruta. |

**Descartado:** orval — genera código de runtime (axios/fetch) + opcionalmente hooks React, lo que acoplaría el package a una librería concreta.

## Estructura del package

```
packages/api-client/
├── package.json              # @core/api-client
├── tsconfig.json
├── src/
│   ├── index.ts              # exports públicos
│   ├── client.ts             # factory createApiClient()
│   └── generated/            # ⚠️ auto-generado, GITIGNORED
│       └── schema.d.ts       # tipos del schema OpenAPI
└── SPEC.md
```

## package.json

```json
{
  "name": "@core/api-client",
  "version": "0.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "generate": "openapi-typescript $API_URL/docs-json -o src/generated/schema.d.ts"
  },
  "dependencies": {
    "openapi-fetch": "^0.13.0"
  },
  "devDependencies": {
    "openapi-typescript": "^7.0.0",
    "typescript": "^5.0.0"
  }
}
```

`API_URL` se pasa como variable de entorno al correr el script. En dev: `http://localhost:3000`.
El archivo `src/generated/schema.d.ts` está **gitignored** — cada desarrollador lo regenera localmente.

## Client factory — `src/client.ts`

```ts
import createFetchClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  const client = createFetchClient<paths>({ baseUrl });

  if (getToken) {
    client.use({
      onRequest({ request }) {
        const token = getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    });
  }

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
```

## Exports públicos — `src/index.ts`

```ts
export { createApiClient } from './client';
export type { ApiClient, ApiClientOptions } from './client';
// Re-export de tipos útiles del schema (cuando sea necesario):
// export type { components } from './generated/schema';
```

## Cómo lo consume el backoffice

```ts
// apps/backoffice/src/api/client.ts
import { createApiClient } from '@core/api-client';
import { useAuthStore } from '../store/auth.store';

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  getToken: () => useAuthStore.getState().token,
});
```

Llamada tipada desde un hook de React Query:

```ts
const { data } = useQuery({
  queryKey: ['users', page],
  queryFn: async () => {
    const { data, error } = await apiClient.GET('/users', {
      params: { query: { page, limit: 20 } },
    });
    if (error) throw error;
    return data;
  },
});
```

`data` queda tipado automáticamente como el schema de respuesta de `GET /users`.

## Flujo de actualización del schema

El schema **no se genera en CI** (la API necesita estar levantada para servir `/docs-json`).
En su lugar, el desarrollador lo regenera manualmente cuando hay cambios en la API:

```bash
# Con la API corriendo localmente:
API_URL=http://localhost:3000 pnpm --filter @core/api-client generate
```

Convenio de equipo: regenerar el client cuando:
1. Se añade o modifica un endpoint en `@core/api`.
2. Se cambia el shape de un DTO.
3. Se añaden nuevos módulos a la API.

## Manejo de errores

`openapi-fetch` devuelve `{ data, error, response }`. El error tipado es el shape del error del endpoint.
Los errores de dominio de la API tienen forma `{ statusCode, code, message }` (ver `AppExceptionFilter`).

El backoffice intercepta errores 401 globalmente:

```ts
// En apps/backoffice/src/api/client.ts
apiClient.use({
  onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      // React Router redirect a /login
    }
  },
});
```

## Regeneración automática (futuro)

Cuando el equipo crezca, se puede automatizar:
1. La API exporta el schema a `apps/api/docs/openapi.json` en cada build.
2. El script `generate` lee el archivo local en lugar del endpoint HTTP.
3. El schema commiteado actúa como contrato versionado.

Esto queda fuera del scope de TASK-24 — se implementará cuando los cambios de schema rompan el
client con suficiente frecuencia como para justificar la automatización.

## Checklist de aceptación

- [ ] `packages/api-client/package.json` con nombre `@core/api-client` y deps correctas
- [ ] `pnpm --filter @core/api-client generate` genera `src/generated/schema.d.ts` desde la API local
- [ ] `createApiClient({ baseUrl, getToken })` devuelve cliente con tipos inferidos por ruta
- [ ] Llamada a un endpoint tipado (`GET /users`) resuelve el tipo de respuesta sin cast manual
- [ ] `src/generated/schema.d.ts` está en `.gitignore`
- [ ] El package se puede consumir desde `apps/backoffice` con `@core/api-client@workspace:*`
- [ ] Interceptor de 401 documentado (la implementación va en el backoffice, no en el package)

## Fuera de scope

- React Query hooks generados (van en el backoffice o en packages dedicados por feature).
- Mock Service Worker (MSW) — si se necesita para tests del backoffice, se añade como tarea aparte.
- Caché de schema en CI.
- Soporte de múltiples versiones de la API.
