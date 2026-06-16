# Spec BO-03: AppLayout + AuthLayout — shell de navegación

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Implementar los dos layouts del backoffice:
- `AuthLayout` — fondo centrado para páginas públicas (login).
- `AppLayout` — sidebar + topbar para páginas protegidas.

El sidebar es **hardcoded** en esta tarea. Se reemplaza con el árbol dinámico de `@core/sections`
en BO-07.

## Prerrequisitos

- BO-01 (scaffold) y BO-02 (autenticación) completados.
- Iconos de `lucide-react` instalados.

## Componentes shadcn a instalar

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add \
  avatar dropdown-menu separator tooltip scroll-area badge
```

## Estructura visual

```
┌──────────────────────────────────────────────────────────┐
│  🔲 Core BO                         [user] ▾             │  ← Topbar (h-14)
├────────────────┬─────────────────────────────────────────┤
│ 🏠 Dashboard   │                                         │
│ ─────────────  │                                         │
│ 👥 IAM         │          <Outlet />                     │
│   Usuarios     │                                         │
│   Roles        │                                         │
│ ─────────────  │                                         │
│ 📄 Secciones   │                                         │
│ 📁 Archivos    │                                         │
└────────────────┴─────────────────────────────────────────┘
  w-60 sidebar         flex-1 content
```

## Archivos a implementar

### `src/layouts/AuthLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Outlet />
    </div>
  );
}
```

### `src/layouts/AppLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Topbar } from '@/components/topbar/Topbar';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### `src/components/sidebar/Sidebar.tsx`

```tsx
import { NavLink } from 'react-router-dom';
import {
  Files, LayoutDashboard, Shield, SquareStack, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon?: React.ElementType;
  href?: string;
  children?: NavItem[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'IAM',
    icon: Shield,
    children: [
      { label: 'Usuarios', icon: Users, href: '/users' },
      { label: 'Roles', icon: Shield, href: '/roles' },
    ],
  },
  { label: 'Secciones', icon: SquareStack, href: '/sections' },
  { label: 'Archivos', icon: Files, href: '/files' },
];

export function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold tracking-tight">Core BO</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => <SidebarItem key={item.label} item={item} depth={0} />)}
      </nav>
    </aside>
  );
}

function SidebarItem({ item, depth }: { item: NavItem; depth: number }) {
  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="mb-1">
        <div className={cn('flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400', depth > 0 && 'pl-6')}>
          {Icon && <Icon size={14} />}
          {item.label}
        </div>
        {item.children.map((child) => <SidebarItem key={child.label} item={child} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href!}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          depth > 0 && 'pl-8',
          isActive
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
        )
      }
    >
      {Icon && <Icon size={16} />}
      {item.label}
    </NavLink>
  );
}
```

### `src/components/topbar/Topbar.tsx`

```tsx
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';

export function Topbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="flex h-14 items-center justify-end border-b bg-white px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1 hover:bg-zinc-100">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-zinc-700">{user?.email}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled>
            <User size={14} className="mr-2" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut size={14} className="mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

## Checklist de aceptación

- [ ] Página de login usa `AuthLayout` (sin sidebar ni topbar)
- [ ] Rutas protegidas usan `AppLayout` (sidebar + topbar visibles)
- [ ] Sidebar resalta con fondo oscuro el ítem activo según la ruta actual
- [ ] Items con hijos muestran el label de grupo (sin ser clickables)
- [ ] Topbar muestra iniciales del usuario en el avatar
- [ ] Menú de usuario desplegable con opción "Cerrar sesión"
- [ ] "Cerrar sesión" llama a `logout()` y redirige a `/login`
- [ ] El área de contenido tiene scroll independiente del sidebar/topbar
- [ ] Sin errores TypeScript al hacer `pnpm build:backoffice`

## Fuera de scope

- Sidebar colapsable (mobile drawer).
- Breadcrumbs.
- Notificaciones en topbar.
- Sidebar dinámico con secciones de la API (→ BO-07).
