# Spec BO-01: Scaffold + arquitectura base

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Inicializar `apps/backoffice` con todas las dependencias, configuración y estructura de carpetas
lista para que el resto de tareas (BO-02 a BO-08) puedan implementarse sin configurar nada.

## Prerrequisitos

- `@core/api-client` generado y disponible en el workspace (TASK-24).
- DB levantada y API corriendo en local.

## Stack

| Capa | Herramienta | Versión |
|---|---|---|
| Build | Vite | 6 |
| Framework | React | 19 |
| Lenguaje | TypeScript | 5 |
| Estilos | Tailwind CSS | v4 |
| Componentes | shadcn/ui | latest |
| Routing | React Router | v7 |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v5 |
| API | @core/api-client | workspace |

## Comandos de inicialización

```bash
# Desde la raíz del repo
pnpm create vite apps/backoffice --template react-ts

# Renombrar en apps/backoffice/package.json:  "name": "@core/backoffice"

# Instalar dependencias
pnpm --filter @core/backoffice add \
  react-router-dom \
  @tanstack/react-query \
  @tanstack/react-table \
  zustand \
  react-hook-form \
  @hookform/resolvers \
  zod \
  sonner \
  lucide-react \
  clsx \
  tailwind-merge

pnpm --filter @core/backoffice add -D \
  @tailwindcss/vite \
  tailwindcss

# Vincular api-client del workspace
pnpm --filter @core/backoffice add @core/api-client@workspace:*

# Inicializar shadcn/ui
pnpm --filter @core/backoffice dlx shadcn@latest init
# → Style: New York, Base color: Zinc, CSS variables: yes
```

## Estructura de archivos final

```
apps/backoffice/
├── index.html
├── package.json                     # @core/backoffice
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── components.json                  # shadcn config
├── .env                             # VITE_API_URL — solo NO-secretos (committed)
├── .env.local                       # secretos / overrides locales (gitignored)
├── .env.example                     # plantilla
├── src/
│   ├── main.tsx                     # ReactDOM.createRoot + providers
│   ├── App.tsx                      # <RouterProvider> — rutas declaradas aquí
│   ├── vite-env.d.ts
│   │
│   ├── api/
│   │   ├── client.ts                # singleton apiClient con token + interceptor 401
│   │   └── query-client.ts          # singleton queryClient (staleTime, retry config)
│   │
│   ├── store/
│   │   └── auth.store.ts            # Zustand: token, user, login(), logout()
│   │
│   ├── lib/
│   │   └── utils.ts                 # cn() = clsx + tailwind-merge
│   │
│   ├── components/
│   │   └── ui/                      # shadcn components (Button, Input, Table…)
│   │
│   ├── layouts/                     # BO-03
│   ├── features/                    # BO-02, BO-06, BO-08…
│   └── docs/
│       └── specs/                   # este directorio
│
├── docs/
│   └── specs/
└── SPEC.md
```

## Archivos clave a implementar en esta tarea

### `vite.config.ts`

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### `src/main.tsx`

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { queryClient } from './api/query-client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
```

### `src/api/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,      // 30 s antes de refetch en background
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Convención de entorno (Vite)

A diferencia del backend (`apps/api`, donde `.env` son los secretos), aquí se sigue la
convención de Vite:

- **`.env`** (committed): solo valores NO-secretos (URLs, endpoints). Requiere la excepción
  `!apps/backoffice/.env` en el `.gitignore` raíz.
- **`.env.local`** (gitignored): secretos y overrides locales. Nunca se commitea.
- **`.env.example`** (committed): plantilla que documenta las claves.

### `.env` (committed)

```
VITE_API_URL=http://localhost:3000
```

### `.env.example` (committed)

```
VITE_API_URL=http://localhost:3000
```

## Scripts en `package.json` raíz

```json
{
  "scripts": {
    "dev:backoffice": "pnpm --filter @core/backoffice dev",
    "build:backoffice": "pnpm --filter @core/backoffice build",
    "preview:backoffice": "pnpm --filter @core/backoffice preview"
  }
}
```

## Checklist de aceptación

- [ ] `pnpm dev:backoffice` arranca en `http://localhost:5173` sin errores de consola
- [ ] `pnpm build:backoffice` produce un bundle sin errores TypeScript
- [ ] Alias `@/` resuelve correctamente en imports
- [ ] `cn()` disponible desde `@/lib/utils`
- [ ] `queryClient` exportado desde `@/api/query-client`
- [ ] shadcn/ui inicializado: `components.json` presente + `src/components/ui/button.tsx` instalado
- [ ] `sonner` `<Toaster>` montado en `main.tsx`
- [ ] `VITE_API_URL` accesible vía `import.meta.env.VITE_API_URL`
- [ ] `@core/api-client` importable sin errores desde `src/api/client.ts`

## Fuera de scope

- Implementación de rutas (BO-02).
- Implementación de layouts (BO-03).
- Lógica de autenticación (BO-02).
