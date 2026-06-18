import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableEmptyState } from './DataTableEmptyState';
import { DataTablePagination } from './DataTablePagination';
import { DataTableSkeleton } from './DataTableSkeleton';
import type { DataTablePaginationConfig } from './types';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pagination: DataTablePaginationConfig;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbar?: ReactNode; // botón "Crear", filtros extra, etc.
  /** Estado de orden controlado (server-side). Si se omite, no hay orden. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  pagination,
  onSearch,
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Sin resultados',
  toolbar,
  sorting,
  onSortingChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');

  // Debounce de 300 ms para no lanzar requests en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => onSearch?.(search), 300);
    return () => clearTimeout(t);
  }, [search, onSearch]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // la paginación la gestiona el servidor
    manualSorting: true, // el orden lo aplica el servidor
    state: { sorting: sorting ?? [] },
    onSortingChange,
    rowCount: pagination.mode === 'offset' ? pagination.pagination.total : undefined,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: búsqueda + acciones */}
      {(onSearch || toolbar) && (
        <div className="flex items-center justify-between gap-4">
          {onSearch ? (
            <div className="relative w-64">
              <Search
                size={14}
                className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
              />
              <Input
                className="pl-8"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <DataTableSkeleton columns={columns.length} rows={10} />
            ) : table.getRowModel().rows.length === 0 ? (
              <DataTableEmptyState
                colSpan={columns.length}
                message={emptyMessage}
              />
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
      <DataTablePagination {...pagination} />
    </div>
  );
}
