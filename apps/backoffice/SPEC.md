# Spec: apps/backoffice — panel de administración

> **Estado:** draft
> **Tarea:** TASK-30

## Objetivo

`apps/backoffice` es el panel de administración interno. Interfaz sencilla y moderna construida
con React + Vite. Consume `@core/api-client` para comunicarse con `@core/api`.

Scope inicial (TASK-30): scaffold funcional con login, layout base y listado de usuarios.
Las secciones de gestión (roles, permisos, etc.) vienen en tareas posteriores.

## Stack técnico

| Capa | Herramienta | Versión | Por qué |
|---|---|---|---|
| Build | Vite | 6 | Rápido, estándar para React, HMR nativo |
| UI framework | React | 19 | Concurrent features, Server Components (futuro) |
| Lenguaje | TypeScript | 5 | — |
| Estilos | Tailwind CSS | v4 | Utilidades CSS, configuración mínima |
| Componentes | shadcn/ui | latest | Primitivas Radix + Tailwind, copy-paste, sin vendor lock-in |
| Routing | React Router | v7 | Simple, sin framework overhead |
| Server state | TanStack Query | v5 | Caché, refetch, loading/error states |
| Client state | Zustand | v5 | Auth token + user info; mínimo, sin boilerplate |
| API client | @core/api-client | workspace | Cliente generado desde OpenAPI |

## Estructura de archivos

```
apps/backoffice/
├── package.json              # @core/backoffice
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
├── src/
│   ├── main.tsx              # bootstrap: React + QueryClient + Router
│   ├── App.tsx               # declaración de rutas
│   │
│   ├── api/
│   │   └── client.ts         # singleton apiClient + queryClient + interceptor 401
│   │
│   ├── store/
│   │   └── auth.store.ts     # Zustand: token, user, login(), logout()
│   │
│   ├── features/             # un folder por dominio funcional
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── hooks/
│   │   │       └── use-login.ts
│   │   └── users/
│   │       ├── UsersPage.tsx
│   │       ├── UserDetailPage.tsx
│   │       └── hooks/
│   │           ├── use-users.ts
│   │           └── use-user.ts
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx    # fondo centrado para /login
│   │   └── AppLayout.tsx     # sidebar + topbar para rutas protegidas
│   │
│   ├── components/           # componentes reutilizables de la app
│   │   ├── ui/               # componentes de shadcn (instalados con CLI)
│   │   ├── ProtectedRoute.tsx
│   │   └── DataTable.tsx     # tabla genérica sobre shadcn/ui Table
│   │
│   └── lib/
│       └── utils.ts          # cn() helper para classnames
│
├── .env.local                # VITE_API_URL=http://localhost:3000 (committed)
├── .env                      # overrides locales (gitignored)
└── SPEC.md
```

## Variables de entorno

| Variable | Dónde | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | `.env.local` (committed) | `http://localhost:3000` |

Convención Vite: solo las variables prefijadas con `VITE_` se exponen al bundle del cliente.
A diferencia de `apps/api/`, aquí `.env.local` es **gitignored** (convención Vite estándar).

```
.env.local    → gitignored (credenciales dev del usuario)
.env          → gitignored
.env.example  → committed (plantilla)
```

En producción, `VITE_API_URL` se inyecta en build time por el CI (ej. `https://api.midominio.com`).

## Rutas (Phase 1)

```
/login                 → LoginPage        (pública)
/                      → redirect a /dashboard
/dashboard             → DashboardPage    (protegida)
/users                 → UsersPage        (protegida)
/users/:id             → UserDetailPage   (protegida)
```

Las rutas protegidas se envuelven en `<ProtectedRoute>`: si no hay token en Zustand, redirige a `/login`.

## Auth flow

```
Usuario → /login → [POST /auth/login] → { token }
         ↓
   useAuthStore.login(token, user)
   token → Zustand (memoria)
   Zustand persiste en sessionStorage (sobrevive reload, no se comparte entre tabs)
         ↓
   Redirect a /dashboard
```

En cada request, `apiClient` inyecta el token:
```ts
getToken: () => useAuthStore.getState().token
```

Cuando la API responde 401:
```ts
apiClient.use({
  onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      // router.navigate('/login')
    }
  },
});
```

No hay refresh token en Phase 1. Cuando expire el JWT, el usuario vuelve a hacer login.
Si el usuario tiene sesión activa de más de X horas, el backend ya invalida el token.

## Zustand auth store

```ts
interface AuthState {
  token: string | null;
  user: { id: string; email: string; userType: UserType } | null;
  login: (token: string, user: AuthState['user']) => void;
  logout: () => void;
}

// Persiste en sessionStorage para sobrevivir refreshes
const useAuthStore = create(
  persist<AuthState>(/* ... */, { name: 'auth', storage: createJSONStorage(() => sessionStorage) })
);
```

## Componente AppLayout

El sidebar se construye en Phase 2 usando `@core/sections`. En Phase 1, hardcoded:

```
┌─────────────────────────────────────────────┐
│  🔲 Core BO         [avatar] [logout]        │  ← topbar
├──────────────┬──────────────────────────────┤
│  Dashboard   │                              │
│  Usuarios ←  │     <Outlet />               │  ← contenido
│              │                              │
└──────────────┴──────────────────────────────┘
```

Sidebar items en Phase 1: Dashboard, Usuarios. En Phase 2 se reemplaza por el árbol de secciones.

## DataTable genérica

Se construye una tabla reutilizable sobre `shadcn/ui Table` + TanStack Table (v8):

```ts
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  queryKey: unknown[];
  fetcher: (params: { page: number; limit: number }) => Promise<PaginatedResponseDto<T>>;
}
```

Incluye: paginación con botones prev/next + input de página, ordenación por columna, loading skeleton, empty state.

## Inicialización del proyecto

```bash
# Desde la raíz del repo:
pnpm create vite apps/backoffice --template react-ts

# Renombrar en package.json:
# "name": "@core/backoffice"

# Instalar deps:
pnpm --filter @core/backoffice add react-router-dom \
  @tanstack/react-query \
  zustand \
  openapi-fetch

pnpm --filter @core/backoffice add -D \
  tailwindcss @tailwindcss/vite \
  @types/react @types/react-dom

# Añadir @core/api-client del workspace:
pnpm --filter @core/backoffice add @core/api-client@workspace:*

# Inicializar shadcn:
pnpm --filter @core/backoffice dlx shadcn@latest init
```

## Scripts en package.json raíz

```json
{
  "scripts": {
    "dev:backoffice": "pnpm --filter @core/backoffice dev",
    "build:backoffice": "pnpm --filter @core/backoffice build"
  }
}
```

## Checklist de aceptación (TASK-30)

- [ ] `pnpm dev:backoffice` arranca en `http://localhost:5173` sin errores
- [ ] `/login` renderiza un formulario de email + password
- [ ] Login exitoso redirige a `/dashboard`; token persiste en sessionStorage
- [ ] Login fallido muestra mensaje de error de la API
- [ ] Rutas protegidas sin token redirigen a `/login`
- [ ] Logout borra token y redirige a `/login`
- [ ] `/users` carga la lista de usuarios con paginación (`page`, `limit`)
- [ ] Tabla muestra skeleton mientras carga y empty state cuando no hay resultados
- [ ] `pnpm build:backoffice` genera un bundle sin errores de TypeScript
- [ ] `VITE_API_URL` configura la URL de la API sin recompilar

## Fuera de scope (TASK-30)

- Sidebar dinámico desde `@core/sections` — Phase 2.
- Formularios con `@core/forms` — Phase 3.
- Gestión de roles y permisos — tareas específicas.
- i18n.
- Dark mode (Tailwind lo soporta; activar cuando haya diseño).
- Tests E2E con Playwright — tarea separada.
- Build/deploy Docker del backoffice.
