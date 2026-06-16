# Spec BO-02: Autenticación — login, sesión y protección de rutas

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Implementar el flujo de autenticación completo: página de login, almacenamiento del JWT,
protección de rutas y manejo del 401 global.

## Prerrequisitos

- BO-01 completado (scaffold con deps instaladas).
- `@core/api-client` operativo (TASK-24).
- API corriendo con `POST /auth/login` disponible.

## Flujo de autenticación

```
/login → POST /auth/login → { token }
    ↓
authStore.login(token, user)     # guarda en Zustand + sessionStorage
    ↓
navigate('/dashboard')

// En cada request:
apiClient → Authorization: Bearer <token>

// Respuesta 401:
authStore.logout()               # limpia store + sessionStorage
navigate('/login')
```

## Archivos a implementar

### `src/store/auth.store.ts`

```ts
import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: 'BACKOFFICE' | 'APP';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'bo-auth',
      storage: createJSONStorage(() => sessionStorage),  // no entre tabs, sobrevive reload
    },
  ),
);
```

### `src/api/client.ts`

```ts
import createFetchClient from 'openapi-fetch';
import type { paths } from '@core/api-client/generated/schema';
import { queryClient } from './query-client';
import { useAuthStore } from '@/store/auth.store';

export const apiClient = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
});

// Inyectar token en cada request
apiClient.use({
  onRequest({ request }) {
    const token = useAuthStore.getState().token;
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
  },
  onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      queryClient.clear();
      window.location.href = '/login';  // hard redirect para limpiar estado
    }
  },
});
```

### `src/components/ProtectedRoute.tsx`

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
```

### `src/features/auth/hooks/use-login.ts`

```ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data, error } = await apiClient.POST('/auth/login', {
        body: credentials,
      });
      if (error) throw error;
      return data;
    },
    onSuccess(data) {
      login(data.token, data.user);
      navigate('/dashboard');
    },
    onError(error: { message?: string }) {
      toast.error(error.message ?? 'Credenciales inválidas');
    },
  });
}
```

### `src/features/auth/LoginPage.tsx`

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useLogin } from './hooks/use-login';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { mutate, isPending } = useLogin();
  const form = useForm<LoginForm>({ resolver: zodResolver(schema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Core Backoffice</h1>
          <p className="text-sm text-zinc-500">Inicia sesión para continuar</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
```

### `src/App.tsx`

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            {/* Resto de rutas en BO-06, BO-08… */}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Componentes shadcn a instalar

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add button input form label
```

## Checklist de aceptación

- [ ] `POST /auth/login` con credenciales válidas → token guardado en sessionStorage + redirect a `/dashboard`
- [ ] `POST /auth/login` con credenciales inválidas → toast de error, no navega
- [ ] Recargar página con sesión activa → sigue autenticado (sessionStorage persiste)
- [ ] Abrir nueva pestaña → NO hereda sesión (sessionStorage no se comparte entre tabs)
- [ ] Navegar a ruta protegida sin token → redirect a `/login`
- [ ] Respuesta 401 de la API → logout automático + redirect a `/login` + queryClient vaciado
- [ ] `logout()` en el store → limpia sessionStorage + redirect a `/login`
- [ ] Email con formato inválido → error de validación inline (no llama a la API)

## Fuera de scope

- Refresh tokens.
- "Recuérdame" (localStorage).
- OAuth / SSO.
- Recuperación de contraseña desde el backoffice.
