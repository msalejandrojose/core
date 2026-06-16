# Spec BO-07: Sidebar dinámico con @core/sections

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Reemplazar el sidebar hardcoded de BO-03 por uno dinámico que consume el árbol
de secciones de `GET /sections/tree?scope=BACKOFFICE`. La navegación disponible
se adapta a los permisos del usuario autenticado.

## Prerrequisitos

- BO-03 completado (sidebar hardcoded funcionando).
- TASK-38 completado: módulo backend `sections` con endpoint `GET /sections/tree`.
- `@core/api-client` regenerado para incluir el nuevo endpoint.
- `@core/sections` package disponible con los tipos (`SectionTreeNode`, etc.).

## API endpoint

```
GET /sections/tree?scope=BACKOFFICE
Authorization: Bearer <token>

Response: SectionTreeNode[]

SectionTreeNode {
  id: string
  code: string
  name: string       // clave i18n → usar como label directamente en v1 (sin i18n)
  icon?: string      // nombre del icono de lucide-react (e.g. "Users", "Shield")
  route?: string     // path en la app (e.g. "/users")
  scope: "BACKOFFICE"
  order: number
  isActive: boolean
  children: SectionTreeNode[]
}
```

## Resolución de iconos

`icon` es un string que mapea al nombre de un componente de `lucide-react`.
Se mantiene un mapa estático; si el icono no está en el mapa, se usa un fallback.

```ts
// src/lib/icons.ts
import {
  Circle, Files, LayoutDashboard, LayoutList, Settings,
  Shield, SquareStack, Users, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Shield,
  SquareStack,
  Files,
  Settings,
  LayoutList,
  // Añadir según se creen secciones nuevas
};

export function resolveIcon(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) ?? Circle;
}
```

## Archivos a implementar / modificar

### `src/features/sections/hooks/use-section-tree.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useSectionTree() {
  return useQuery({
    queryKey: ['section-tree', 'BACKOFFICE'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/sections/tree', {
        params: { query: { scope: 'BACKOFFICE' } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,   // 5 min: el árbol cambia poco
  });
}
```

### `src/components/sidebar/DynamicSidebar.tsx`

Reemplaza `Sidebar.tsx` de BO-03.

```tsx
import { NavLink } from 'react-router-dom';
import type { SectionTreeNode } from '@core/sections';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useSectionTree } from '@/features/sections/hooks/use-section-tree';

export function DynamicSidebar() {
  const { data: tree, isLoading } = useSectionTree();

  return (
    <aside className="flex w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold tracking-tight">Core BO</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <SidebarSkeleton />
        ) : (
          (tree ?? []).map((node) => <SidebarNode key={node.id} node={node} depth={0} />)
        )}
      </nav>
    </aside>
  );
}

function SidebarNode({ node, depth }: { node: SectionTreeNode; depth: number }) {
  const Icon = resolveIcon(node.icon);

  // Nodo sin ruta = grupo/categoría
  if (!node.route) {
    return (
      <div className="mb-1">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400',
          depth > 0 && 'pl-6',
        )}>
          <Icon size={14} />
          {node.name}
        </div>
        {node.children.map((child) => (
          <SidebarNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <>
      <NavLink
        to={node.route}
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
        <Icon size={16} />
        {node.name}
      </NavLink>
      {node.children.map((child) => (
        <SidebarNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
}
```

### Modificar `AppLayout.tsx` (BO-03)

Cambiar `<Sidebar />` por `<DynamicSidebar />`:

```tsx
import { DynamicSidebar } from '@/components/sidebar/DynamicSidebar';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <DynamicSidebar />   {/* ← reemplaza <Sidebar /> */}
      {/* … */}
    </div>
  );
}
```

## Caché e invalidación

El árbol se cachea 5 minutos. Se invalida manualmente si:
1. El usuario cambia sus propios roles (poco frecuente en el backoffice).
2. Un admin edita la estructura de secciones.

```ts
// Cuando se actualice la estructura desde el módulo de secciones:
queryClient.invalidateQueries({ queryKey: ['section-tree'] });
```

## i18n (Phase 1)

En Phase 1, `node.name` se usa directamente como label (puede ser `"nav.users"` o `"Usuarios"`).
El seed inicial cargará labels en español directamente en `name`. Cuando se integre i18n,
`name` pasará a ser una clave de traducción y el sidebar la resolverá.

## Checklist de aceptación

- [ ] El sidebar carga el árbol desde `GET /sections/tree?scope=BACKOFFICE`
- [ ] Muestra skeleton mientras carga
- [ ] Nodos sin `route` se renderizan como grupos (no clickables)
- [ ] Nodos con `route` son links con estado activo según la ruta actual
- [ ] Iconos se resuelven desde `lucide-react` por nombre; los desconocidos usan el fallback
- [ ] El árbol respeta el `order` de los nodos dentro de cada nivel
- [ ] Solo aparecen secciones que la API devuelve (filtradas por permisos del usuario)
- [ ] Error al cargar el árbol: sidebar vacío sin crashes
- [ ] El caché de 5 minutos evita llamadas repetidas al navegar entre páginas

## Fuera de scope

- i18n de labels.
- Sidebar colapsable (iconos solo sin texto).
- Notificaciones / badges en ítems del sidebar.
- Drag-and-drop para reordenar desde el backoffice.
