/** Paginación offset (jump-to-page): requiere que el servidor devuelva el total. */
export interface OffsetPaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BasePaginationProps {
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}

export interface OffsetPaginationProps extends BasePaginationProps {
  mode: 'offset';
  pagination: OffsetPaginationState;
  onPageChange: (page: number) => void;
}

/**
 * Paginación por cursor (la convención por defecto del API): solo se conoce si
 * hay página siguiente (`hasMore`). El avance/retroceso lo gestiona el consumidor
 * con una pila de cursores; aquí solo se exponen los callbacks.
 */
export interface CursorPaginationProps extends BasePaginationProps {
  mode: 'cursor';
  limit: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export type DataTablePaginationConfig =
  | OffsetPaginationProps
  | CursorPaginationProps;
