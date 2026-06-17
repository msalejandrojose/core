# Spec BO-08: Módulo Roles — listado + detalle + CRUD

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Segunda feature completa del backoffice: listar roles, ver su detalle (con permisos asignados),
y hacer create/update/delete. Sigue exactamente los mismos patrones de BO-06.

## Prerrequisitos

- BO-04 (DataTable), BO-05 (CRUD base) y BO-06 (Usuarios) completados.
- `@core/api-client` con todos los endpoints de roles disponibles.

## Notas de implementación (desviaciones del draft)

Implementado contra el contrato real del API:

1. **Listado offset** (`/roles?page=&limit=&sort=&order=&scope=&codeContains=`) → se usa el modo
   `offset` del DataTable. Búsqueda por `codeContains` (no `search`). (A diferencia de Usuarios,
   que es cursor.)
2. **Permisos**: `GET /roles/:roleId/permissions` devuelve `{ apiSectionId, level }[]` (no
   `apiSectionCode`/`apiSectionName`/`permissionLevel`). Para mostrar code/name se cruza con
   `GET /api-sections`. Setear = `PUT /roles/:roleId/permissions/:sectionId` con body `{ level }`
   (la sección va en la **ruta**, no en el body). Revocar = `DELETE` mismo path.
3. **Panel de permisos**: elegir un nivel hace grant (PUT); elegir `NONE` hace **revoke** (DELETE)
   → la fila vuelve a "sin permiso". (No se expone el `NONE` como bloqueo explícito en v1.)
4. **`code` admite `[a-z0-9_-]`** (2-64), no solo `[a-z0-9_]`; es inmutable (readonly en edición).
5. `useDeleteRole` acepta `onSuccess` para redirigir a `/roles` desde el detalle.

## API endpoints usados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/roles?page=&limit=&search=&scope=` | Listado paginado |
| GET | `/roles/:id` | Detalle |
| POST | `/roles` | Crear |
| PATCH | `/roles/:id` | Editar |
| DELETE | `/roles/:id` | Eliminar |
| GET | `/roles/:id/permissions` | Permisos del rol |
| PUT | `/roles/:id/permissions` | Asignar permiso a sección |
| DELETE | `/roles/:id/permissions/:sectionId` | Revocar permiso |

## Estructura de archivos

```
src/features/roles/
├── RolesPage.tsx
├── RoleDetailPage.tsx
├── columns.tsx
├── hooks/
│   ├── use-roles.ts
│   ├── use-role.ts
│   ├── use-create-role.ts
│   ├── use-update-role.ts
│   ├── use-delete-role.ts
│   ├── use-role-permissions.ts
│   ├── use-grant-role-permission.ts
│   └── use-revoke-role-permission.ts
└── components/
    ├── CreateRoleDialog.tsx
    ├── EditRoleForm.tsx
    ├── DeleteRoleDialog.tsx
    └── RolePermissionsPanel.tsx
```

## Tipos y enums

```ts
type RoleScope = 'BACKOFFICE' | 'APP' | 'SHARED';
type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';

interface RoleRow {
  id: string;
  code: string;
  name: string;
  scope: RoleScope;
  description?: string;
  createdAt: string;
}

interface RolePermission {
  apiSectionId: string;
  apiSectionCode: string;
  apiSectionName: string;
  permissionLevel: PermissionLevel;
}
```

## Hooks

### `use-roles.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface UseRolesParams {
  page: number;
  limit: number;
  search?: string;
  scope?: RoleScope;
}

export function useRoles(params: UseRolesParams) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/roles', {
        params: { query: { ...params } },
      });
      if (error) throw error;
      return data;
    },
  });
}
```

### `use-create-role.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useCreateRole({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { code: string; name: string; scope: RoleScope; description?: string; parentRoleId?: string }) => {
      const { data, error } = await apiClient.POST('/roles', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol creado correctamente');
      onSuccess?.();
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al crear el rol');
    },
  });
}
```

### `use-delete-role.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/roles/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol eliminado');
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'No se puede eliminar: el rol está en uso');
    },
  });
}
```

### `use-grant-role-permission.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useGrantRolePermission(roleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { apiSectionId: string; permissionLevel: PermissionLevel }) => {
      const { error } = await apiClient.PUT('/roles/{id}/permissions', {
        params: { path: { id: roleId } },
        body,
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['role-permissions', roleId] });
      toast.success('Permiso actualizado');
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al actualizar permiso');
    },
  });
}
```

## `columns.tsx`

```tsx
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { useDeleteRole } from './hooks/use-delete-role';

const SCOPE_COLOR: Record<string, 'default' | 'secondary' | 'outline'> = {
  BACKOFFICE: 'default',
  APP: 'secondary',
  SHARED: 'outline',
};

export const columns: ColumnDef<RoleRow>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <Link to={`/roles/${row.original.id}`} className="font-mono text-sm font-medium hover:underline">
        {row.original.code}
      </Link>
    ),
  },
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'scope',
    header: 'Scope',
    cell: ({ row }) => (
      <Badge variant={SCOPE_COLOR[row.original.scope] ?? 'outline'}>{row.original.scope}</Badge>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => <span className="text-zinc-500">{row.original.description ?? '—'}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => <RoleRowActions id={row.original.id} />,
  },
];

function RoleRowActions({ id }: { id: string }) {
  const { mutate: deleteRole, isPending } = useDeleteRole();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/roles/${id}`}>Ver detalle</Link>
        </DropdownMenuItem>
        <ConfirmDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
              Eliminar
            </DropdownMenuItem>
          }
          title="¿Eliminar rol?"
          description="Los usuarios con este rol perderán sus permisos asociados."
          onConfirm={() => deleteRole(id)}
          isPending={isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## `RoleDetailPage.tsx` (estructura)

```tsx
// Secciones: info del rol | permisos sobre ApiSections

export function RoleDetailPage() {
  const { id } = useParams();
  const { data: role } = useRole(id!);
  const { data: permissions } = useRolePermissions(id!);
  const { data: apiSections } = useApiSections(); // para el selector de secciones

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header con botón atrás */}
      {/* Card: info del rol — código (readonly), nombre, scope, descripción, rol padre */}
      {/* Card: permisos — tabla de apiSections con selector de nivel por fila */}
      {/* Zona de peligro: DeleteRoleDialog */}
    </div>
  );
}
```

### Panel de permisos

Tabla con todas las `ApiSection` disponibles. Por cada una, un `<Select>` con los niveles
`NONE | READ | WRITE | DELETE | ADMIN`. Al cambiar el valor, llama a `useGrantRolePermission`.
Si se selecciona `NONE` y ya había un permiso, se puede optar por revocar directamente.

```tsx
function RolePermissionsPanel({ roleId }: { roleId: string }) {
  const { data: permissions } = useRolePermissions(roleId);
  const { data: sections } = useApiSections();
  const { mutate: grant } = useGrantRolePermission(roleId);

  const permMap = new Map(permissions?.map((p) => [p.apiSectionId, p.permissionLevel]));

  return (
    <div className="space-y-2">
      {sections?.data.map((section) => (
        <div key={section.id} className="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <p className="text-sm font-medium">{section.name}</p>
            <p className="text-xs text-zinc-400 font-mono">{section.code}</p>
          </div>
          <Select
            value={permMap.get(section.id) ?? 'NONE'}
            onValueChange={(level) => grant({ apiSectionId: section.id, permissionLevel: level as PermissionLevel })}
          >
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['NONE', 'READ', 'WRITE', 'DELETE', 'ADMIN'] as PermissionLevel[]).map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
```

## Formulario de creación — `CreateRoleDialog.tsx`

```tsx
const schema = z.object({
  code: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y _'),
  name: z.string().min(1),
  scope: z.enum(['BACKOFFICE', 'APP', 'SHARED']),
  description: z.string().optional(),
});
```

Campos: `code` (input + hint de formato), `name`, `scope` (Select), `description` (textarea).

## Rutas a añadir en `App.tsx`

```tsx
import { RolesPage } from '@/features/roles/RolesPage';
import { RoleDetailPage } from '@/features/roles/RoleDetailPage';

<Route path="/roles" element={<RolesPage />} />
<Route path="/roles/:id" element={<RoleDetailPage />} />
```

## Checklist de aceptación

- [ ] `/roles` carga la lista con paginación y skeleton
- [ ] Columna "Código" es link a `/roles/:id`
- [ ] Badge de scope con colores diferenciados (default/secondary/outline)
- [ ] `CreateRoleDialog`: código solo acepta `[a-z0-9_]`, error inline si no
- [ ] `CreateRoleDialog`: código duplicado devuelve error de la API como toast
- [ ] `DeleteRoleDialog`: solicita confirmación; rol en uso → toast de error (409)
- [ ] `/roles/:id` muestra info editable del rol
- [ ] Panel de permisos carga todas las ApiSections con el nivel asignado
- [ ] Cambiar nivel en el panel llama a la API y actualiza el estado
- [ ] La lista se refresca tras crear o eliminar un rol sin reload
- [ ] Sin errores TypeScript

## Fuera de scope

- Herencia de roles (campo `parentRoleId` en BO-08 v1 queda como select opcional).
- Asignar/quitar roles a usuarios desde esta pantalla (ya está en el detalle de usuario).
- Historial de cambios de permisos.
