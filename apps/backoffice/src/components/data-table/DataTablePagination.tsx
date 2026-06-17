import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CursorPaginationProps,
  DataTablePaginationConfig,
  OffsetPaginationProps,
} from './types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTablePagination(props: DataTablePaginationConfig) {
  return props.mode === 'offset' ? (
    <OffsetPagination {...props} />
  ) : (
    <CursorPagination {...props} />
  );
}

function PageSizeSelect({
  limit,
  onLimitChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  limit: number;
  onLimitChange: (limit: number) => void;
  pageSizeOptions?: number[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span>Filas</span>
      <Select
        value={String(limit)}
        onValueChange={(v) => onLimitChange(Number(v))}
      >
        <SelectTrigger size="sm" className="w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OffsetPagination({
  pagination,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
}: OffsetPaginationProps) {
  const { page, limit, total, totalPages } = pagination;

  return (
    <div className="text-muted-foreground flex items-center justify-between text-sm">
      <span>
        {total} resultado{total !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-4">
        {onLimitChange && (
          <PageSizeSelect
            limit={limit}
            onLimitChange={onLimitChange}
            pageSizeOptions={pageSizeOptions}
          />
        )}
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CursorPagination({
  limit,
  hasMore,
  hasPrevious,
  onNext,
  onPrevious,
  onLimitChange,
  pageSizeOptions,
}: CursorPaginationProps) {
  return (
    <div className="text-muted-foreground flex items-center justify-end gap-4 text-sm">
      {onLimitChange && (
        <PageSizeSelect
          limit={limit}
          onLimitChange={onLimitChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          <ChevronLeft size={14} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onNext}
          disabled={!hasMore}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
