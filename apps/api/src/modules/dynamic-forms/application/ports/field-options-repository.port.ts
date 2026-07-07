/**
 * Puerto de "repositorio de opciones" para los selectores con fuente por
 * repositorio (§5 del SPEC de `@core/forms`). Un campo `select`/`multiselect`/
 * `radio` puede declarar `source: { repository: 'Role' }` y el frontend resuelve
 * las opciones llamando a `GET /forms/repository/:entity`.
 *
 * Cada `entity` la implementa un adapter de infraestructura (Prisma, etc.) que
 * se registra en el módulo con el token `FIELD_OPTIONS_REPOSITORIES` (multi).
 * El nombre "options" evita colisión con el `FORM_REPOSITORY` (CRUD de Form).
 */

export interface FieldOptionsQuery {
  /** Búsqueda libre sobre las etiquetas/códigos. */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FieldOption {
  value: string;
  label: string;
  /** Valor del padre, para selectores en cascada / árbol. */
  parentValue?: string | null;
  disabled?: boolean;
}

export interface FieldOptionsResult {
  options: FieldOption[];
  /** Total sin paginar, si el repositorio lo conoce. */
  total?: number;
}

export interface FieldOptionsRepository {
  /** Nombre público de la entidad (el `:entity` de la ruta). */
  readonly entity: string;
  list(query?: FieldOptionsQuery): Promise<FieldOptionsResult>;
  getByValue(value: string): Promise<FieldOption | null>;
}

/** Token multi-provider: cada repositorio concreto se registra aquí. */
export const FIELD_OPTIONS_REPOSITORIES = Symbol('FIELD_OPTIONS_REPOSITORIES');
