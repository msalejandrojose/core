// Shape genérico que devuelven los repositorios para listados paginados.
// El controller lo traduce a `PaginatedResponseDto<TResponseDto>` con `.of(...)`.
export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
