/**
 * Tipos compartidos por los ports/repositorios para devolver páginas de
 * resultados. El use case devuelve un `Page<T>` y el controller lo
 * envuelve en `PaginatedResponseDto<T>` antes de salir por HTTP.
 *
 * Mantenemos esto separado de los DTOs HTTP para que la capa de dominio
 * y application no dependan de `@nestjs/swagger` ni de `class-validator`.
 */

export type SortDirection = 'asc' | 'desc';

export interface Sort {
  field: string;
  direction: SortDirection;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface OffsetPage<T> {
  items: T[];
  total: number;
}
