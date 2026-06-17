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
