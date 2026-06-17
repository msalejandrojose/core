# Spec BO-06: Módulo Usuarios — listado + detalle + CRUD

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Primera feature completa del backoffice: listar usuarios, ver su detalle y hacer
create/update/deactivate usando los patrones establecidos en BO-04 y BO-05.

## Prerrequisitos

- BO-01 a BO-05 completados.
- `@core/api-client` generado con los endpoints de IAM disponibles.

## Notas de implementación (desviaciones del draft)

El draft asumía un API offset (`page`/`search`/`PATCH …/deactivate`); el API real difiere y se
implementó contra él:

1. **Listado cursor-paginado**, no offset. `GET /users?limit=&cursor=&emailContains=&userType=&isActive=`
   devuelve `{ data, meta: { limit, nextCursor, hasMore } }` — sin `total` ni nº de página.
2. **Por eso se extendió el `DataTable` (BO-04) con un modo `cursor`** (prev/next mediante una pila
   de cursores que mantiene `UsersPage`). El modo `offset` original sigue disponible.
3. **Búsqueda por `emailContains`** (no `search`); solo filtra por email.
4. **Desactivar = `DELETE /users/:id`** (204), no `PATCH /users/:id/deactivate`.
5. **Crear exige `userType`** (`BACKOFFICE`|`APP`): el `CreateUserDialog` incluye un selector.
6. `use-update-user` envía `firstName`/`lastName` como `null` para borrarlos (el API lo admite).
7. Fechas con `toLocaleDateString('es-ES')` en vez de añadir `date-fns`.

## API endpoints usados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/users?page=&limit=&search=&userType=&isActive=` | Listado paginado |
| GET | `/users/:id` | Detalle |
| POST | `/users` | Crear |
| PATCH | `/users/:id` | Editar |
| PATCH | `/users/:id/deactivate` | Desactivar |
| GET | `/users/:id/roles` | Roles del usuario |

## Estructura de archivos

```
src/features/users/
├── UsersPage.tsx
├── UserDetailPage.tsx
├── columns.tsx                      # ColumnDef[] para DataTable
├── hooks/
│   ├── use-users.ts                 # listado paginado
│   ├── use-user.ts                  # detalle individual
│   ├── use-create-user.ts
│   ├── use-update-user.ts
│   └── use-deactivate-user.ts
└── components/
    ├── CreateUserDialog.tsx
    ├── EditUserForm.tsx
    └── DeactivateUserDialog.tsx
```

## Hooks

### `use-users.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface UseUsersParams {
  page: number;
  limit: number;
  search?: string;
  userType?: 'BACKOFFICE' | 'APP';
  isActive?: boolean;
}

export function useUsers(params: UseUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/users', {
        params: { query: { ...params } },
      });
      if (error) throw error;
      return data;
    },
  });
}
```

### `use-create-user.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useCreateUser({ onSuccess }: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string; firstName?: string; lastName?: string; userType?: 'BACKOFFICE' | 'APP' }) => {
      const { data, error } = await apiClient.POST('/users', { body });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado correctamente');
      onSuccess?.();
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al crear el usuario');
    },
  });
}
```

### `use-update-user.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { firstName?: string; lastName?: string; isActive?: boolean }) => {
      const { data, error } = await apiClient.PATCH('/users/{id}', {
        params: { path: { id } }, body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
      toast.success('Usuario actualizado');
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al actualizar');
    },
  });
}
```

### `use-deactivate-user.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';

export function useDeactivateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/users/{id}/deactivate', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess() {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', id] });
      toast.success('Usuario desactivado');
    },
    onError(e: { message?: string }) {
      toast.error(e.message ?? 'Error al desactivar');
    },
  });
}
```

## `columns.tsx`

```tsx
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { useDeactivateUser } from './hooks/use-deactivate-user';

// El tipo viene inferido de la respuesta de la API
type UserRow = {
  id: string; email: string; firstName?: string; lastName?: string;
  userType: string; isActive: boolean; createdAt: string;
};

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <Link to={`/users/${row.original.id}`} className="font-medium hover:underline">
        {row.original.email}
      </Link>
    ),
  },
  {
    id: 'name',
    header: 'Nombre',
    cell: ({ row }) => [row.original.firstName, row.original.lastName].filter(Boolean).join(' ') || '—',
  },
  {
    accessorKey: 'userType',
    header: 'Tipo',
    cell: ({ row }) => <Badge variant="outline">{row.original.userType}</Badge>,
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Creado',
    cell: ({ row }) => format(new Date(row.original.createdAt), 'dd/MM/yyyy'),
  },
  {
    id: 'actions',
    cell: ({ row }) => <UserRowActions id={row.original.id} isActive={row.original.isActive} />,
  },
];

function UserRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const { mutate: deactivate, isPending } = useDeactivateUser(id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/users/${id}`}>Ver detalle</Link>
        </DropdownMenuItem>
        {isActive && (
          <ConfirmDialog
            trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">Desactivar</DropdownMenuItem>}
            title="¿Desactivar usuario?"
            description="El usuario no podrá iniciar sesión. Se puede reactivar desde el detalle."
            onConfirm={() => deactivate()}
            isPending={isPending}
            destructiveLabel="Desactivar"
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## `UsersPage.tsx`

```tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { CreateUserDialog } from './components/CreateUserDialog';
import { useUsers } from './hooks/use-users';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useUsers({ page, limit, search });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
      </div>
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        pagination={data?.meta ?? { page, limit, total: 0, totalPages: 1 }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={setSearch}
        searchPlaceholder="Buscar por email o nombre…"
        emptyMessage="No hay usuarios"
        toolbar={<CreateUserDialog />}
      />
    </div>
  );
}
```

## `UserDetailPage.tsx` (estructura)

```tsx
// Vista de detalle + formulario de edición inline
// Secciones: Info general | Roles asignados

export function UserDetailPage() {
  const { id } = useParams();
  const { data: user, isLoading } = useUser(id!);
  const { mutate: update, isPending } = useUpdateUser(id!);
  const form = useForm(/* ... */);

  // useEffect: poblar el form cuando lleguen los datos del usuario

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft size={16} /></Button>
        <h1 className="text-2xl font-semibold">Detalle de usuario</h1>
        {user && <Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Activo' : 'Inactivo'}</Badge>}
      </div>

      {/* Formulario de edición */}
      <Card>
        <CardHeader><CardTitle>Información general</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => update(v))} className="space-y-4">
              {/* firstName, lastName, email (readonly) */}
              <Button type="submit" disabled={isPending}>Guardar cambios</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
        <CardContent>{/* lista de roles */}</CardContent>
      </Card>

      {/* Zona de peligro */}
      {user?.isActive && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-600">Zona de peligro</CardTitle></CardHeader>
          <CardContent>
            <DeactivateUserDialog id={id!} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Rutas a añadir en `App.tsx`

```tsx
import { UsersPage } from '@/features/users/UsersPage';
import { UserDetailPage } from '@/features/users/UserDetailPage';

// Dentro de <Route element={<AppLayout />}>:
<Route path="/users" element={<UsersPage />} />
<Route path="/users/:id" element={<UserDetailPage />} />
```

## Componentes shadcn adicionales

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add \
  card dropdown-menu badge
```

## Checklist de aceptación

- [ ] `/users` carga la lista con paginación, skeleton y empty state
- [ ] Búsqueda filtra por email/nombre con debounce
- [ ] Columna "Email" es un link a `/users/:id`
- [ ] Menú de acciones por fila: "Ver detalle" y "Desactivar" (solo si activo)
- [ ] Dialog de desactivación pide confirmación antes de llamar a la API
- [ ] Toast de éxito/error tras cada mutación
- [ ] La lista se refresca automáticamente tras crear/desactivar un usuario
- [ ] `/users/:id` muestra datos del usuario; formulario editable para nombre
- [ ] Guardar cambios en el detalle actualiza el usuario vía PATCH
- [ ] Botón "Desactivar" en el detalle hace lo mismo que desde la lista
- [ ] `CreateUserDialog` valida email y contraseña antes de llamar a la API
- [ ] Usuario recién creado aparece en la lista sin reload manual

## Fuera de scope

- Reactivar usuario (se puede añadir en el detalle como PATCH isActive: true).
- Gestión de permisos directos del usuario (→ tarea de permisos).
- Cambio de contraseña desde el backoffice.
- Filtro por userType e isActive (se añade como mejora sobre este módulo).
