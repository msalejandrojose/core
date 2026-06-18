import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

/**
 * Cabecera de columna ordenable. Alterna asc → desc → asc al pulsar y refleja
 * el sentido con una flecha. Si la columna no es ordenable, pinta el título.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
        sorted && 'text-foreground',
        className,
      )}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp size={14} />
      ) : sorted === 'desc' ? (
        <ArrowDown size={14} />
      ) : (
        <ChevronsUpDown size={14} className="opacity-50" />
      )}
    </button>
  );
}
