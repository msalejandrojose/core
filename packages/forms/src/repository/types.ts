/**
 * Contrato de "selectores con repositorio" (§5 del SPEC).
 *
 * Un campo de selección (`select` / `multiselect` / `radio`) puede declarar que
 * sus opciones provienen de un repositorio de datos en vez de una lista
 * estática. El schema solo declara la referencia (`RepositorySource`); la
 * resolución la hace `resolveFormRepositories` con un `FormRepositoryRegistry`
 * inyectado por la app (el package no conoce la fuente concreta).
 */

/** Una opción resuelta desde un repositorio. */
export interface FormRepositoryOption {
  value: string;
  label: string;
  /** Valor del padre, para selectores en cascada / árbol. */
  parentValue?: string | null;
  disabled?: boolean;
}

/** Parámetros de consulta al repositorio (búsqueda, filtros, paginación). */
export interface FormRepositoryQuery {
  search?: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}

export interface FormRepositoryResult {
  options: FormRepositoryOption[];
  /** Total sin paginar, si el repositorio lo conoce. */
  total?: number;
}

/**
 * Repositorio de opciones para un `entity`. Implementado por cada app con su
 * fuente de datos (Prisma, memoria, HTTP…). Los métodos pueden ser sync o async.
 */
export interface FormRepository {
  readonly entity: string;
  list(
    query?: FormRepositoryQuery,
  ): FormRepositoryResult | Promise<FormRepositoryResult>;
  getByValue(
    value: string,
  ): FormRepositoryOption | null | Promise<FormRepositoryOption | null>;
}

/** Registro `entity → FormRepository` que consume `resolveFormRepositories`. */
export type FormRepositoryRegistry = Record<string, FormRepository>;

/** Referencia declarativa a un repositorio desde un campo de selección. */
export interface RepositorySource {
  /** Nombre del `entity` registrado (p. ej. `"Section"`). */
  repository: string;
  /** Consulta fija asociada al campo (p. ej. `{ filters: { scope: 'BACKOFFICE' } }`). */
  query?: FormRepositoryQuery;
}
