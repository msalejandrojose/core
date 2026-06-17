# Spec BO-04: DataTable — componente genérico de listado

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Componente genérico `<DataTable>` reutilizable para todos los listados del backoffice.
Incluye paginación, ordenación por columna, búsqueda, skeleton de carga y empty state.

## Prerrequisitos

- BO-01 (scaffold) completado.
- `@tanstack/react-table` instalado (ya en BO-01).

## Componentes shadcn a instalar

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add \
  table select skeleton input
```

## Estructura de archivos

```
src/components/data-table/
├── DataTable.tsx             # componente principal
├── DataTablePagination.tsx   # controles de paginación
├── DataTableSkeleton.tsx     # estado de carga
├── DataTableEmptyState.tsx   # sin resultados
├── DataTableColumnHeader.tsx # cabecera con sort
└── types.ts                  # tipos compartidos
```

> **Nota de implementación:** `DataTableColumnHeader.tsx` (cabecera con sort) **no** se creó en
> BO-04: la ordenación por columna está fuera de scope (ver final del documento) y el draft no
> aporta su implementación. Se añadirá en el listado que lo necesite. Los estilos usan tokens del
> tema en lugar de `zinc` hardcoded.

## Tipos — `types.ts`

```ts
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DataTablePaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}
```

## `DataTable.tsx`

```tsx
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DataTableEmptyState } from './DataTableEmptyState';
import { DataTablePagination } from './DataTablePagination';
import { DataTableSkeleton } from './DataTableSkeleton';
import type { DataTablePaginationProps } from './types';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pagination: DataTablePaginationProps['pagination'];
  onPageChange: DataTablePaginationProps['onPageChange'];
  onLimitChange?: DataTablePaginationProps['onLimitChange'];
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: React.ReactNode;           // botón "Crear", filtros extra, etc.
}

export function DataTable<T>({
  data, columns, isLoading, pagination,
  onPageChange, onLimitChange, onSearch,
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Sin resultados',
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');

  // Debounce de 300 ms para no lanzar requests en cada tecla
  useEffect(() => {
    const t = setTimeout(() => onSearch?.(search), 300);
    return () => clearTimeout(t);
  }, [search, onSearch]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,      // la paginación la gestiona el servidor
    manualSorting: true,
    rowCount: pagination.total,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: búsqueda + acciones */}
      <div className="flex items-center justify-between gap-4">
        {onSearch && (
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-8"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-center gap-2">{toolbar}</div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <DataTableSkeleton columns={columns.length} rows={10} />
            ) : table.getRowModel().rows.length === 0 ? (
              <DataTableEmptyState colSpan={columns.length} message={emptyMessage} />
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-zinc-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <DataTablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
```

## `DataTablePagination.tsx`

```tsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DataTablePaginationProps } from './types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTablePagination({ pagination, onPageChange, onLimitChange, pageSizeOptions = PAGE_SIZE_OPTIONS }: DataTablePaginationProps) {
  const { page, limit, total, totalPages } = pagination;

  return (
    <div className="flex items-center justify-between text-sm text-zinc-600">
      <span>{total} resultado{total !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-4">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span>Filas</span>
            <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <span>Página {page} de {totalPages}</span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={page <= 1}><ChevronsLeft size={14} /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}><ChevronRight size={14} /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}><ChevronsRight size={14} /></Button>
        </div>
      </div>
    </div>
  );
}
```

## `DataTableSkeleton.tsx`

```tsx
import { TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export function DataTableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return Array.from({ length: rows }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: columns }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ));
}
```

## `DataTableEmptyState.tsx`

```tsx
import { Inbox } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';

export function DataTableEmptyState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <Inbox size={32} />
          <span className="text-sm">{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
```

## Patrón de uso en una feature

```tsx
// src/features/users/UsersPage.tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { useUsers } from './hooks/use-users';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useUsers({ page, limit, search });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        pagination={data?.meta ?? { page, limit, total: 0, totalPages: 0 }}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSearch={setSearch}
        searchPlaceholder="Buscar por email o nombre…"
        emptyMessage="No hay usuarios"
      />
    </div>
  );
}
```

## Checklist de aceptación

- [ ] `DataTable` renderiza filas cuando hay datos
- [ ] `isLoading=true` muestra skeleton (sin datos reales)
- [ ] Sin datos muestra empty state con icono y mensaje
- [ ] Búsqueda con debounce 300 ms: no llama `onSearch` en cada tecla
- [ ] Paginación: botones first/prev/next/last; los extremos se deshabilitan correctamente
- [ ] Selector de filas por página llama `onLimitChange`
- [ ] El contador "X resultados" refleja el total del servidor
- [ ] `toolbar` prop renderiza contenido a la derecha de la búsqueda
- [ ] Sin errores TypeScript: `ColumnDef<T>` y `DataTableProps<T>` correctamente tipados

## Fuera de scope

- Ordenación por columna (la API recibe `sort` + `order`; la UI para activarlo se añade en la tarea de cada listado si se necesita).
- Filtros avanzados por columna.
- Exportar a CSV.
- Selección de filas (checkboxes).
