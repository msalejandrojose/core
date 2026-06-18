export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

// Alias histórico de `CursorPage` usado por `pagination.builders.ts`.
export type Page<T> = CursorPage<T>;

export type SortDirection = 'asc' | 'desc';

// Resultado de parsear el query param `sort` (`field:asc` | `field:desc`).
export type Sort = {
  field: string;
  direction: SortDirection;
};
