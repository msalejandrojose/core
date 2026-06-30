import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertTriangle, Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  isError?: boolean;
  onRetry?: () => void;
  pagination: DataTablePaginationConfig;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyCta?: ReactNode;
  toolbar?: ReactNode;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  isError,
  onRetry,
  pagination,
  onSearch,
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Sin resultados',
  emptyCta,
  toolbar,
  sorting,
  onSortingChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => onSearch?.(search), 300);
    return () => clearTimeout(t);
  }, [search, onSearch]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: { sorting: sorting ?? [] },
    onSortingChange,
    rowCount: pagination.mode === 'offset' ? pagination.pagination.total : undefined,
  });

  return (
    <div className="space-y-4">
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
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-3">
                    <AlertTriangle size={28} className="text-destructive/60" />
                    <span className="text-sm">Error al cargar los datos.</span>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Reintentar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <DataTableEmptyState
                colSpan={columns.length}
                message={emptyMessage}
                cta={emptyCta}
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

      <DataTablePagination {...pagination} />
    </div>
  );
}
