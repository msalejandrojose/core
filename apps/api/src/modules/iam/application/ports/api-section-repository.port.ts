import type { Filter, FindSpec } from '../../../../shared/query';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { ApiSection } from '../../domain/entities/api-section.entity';

export const API_SECTION_REPOSITORY = Symbol('IAM_API_SECTION_REPOSITORY');

/** @deprecated Usar `getRows({ filter, order, limit })`. */
export interface ListApiSectionsOptions {
  page: number;
  limit: number;
  sort?: string;
  order: 'asc' | 'desc';
  parentSectionId?: string | null;
  codeContains?: string;
}

export interface UpdateApiSectionPatch {
  name?: string;
  description?: string | null;
  parentSectionId?: string | null;
}

export interface ApiSectionRepositoryPort {
  findById(id: string): Promise<ApiSection | null>;
  findByCode(code: string): Promise<ApiSection | null>;
  create(section: ApiSection): Promise<ApiSection>;
  update(id: string, patch: UpdateApiSectionPatch): Promise<ApiSection>;
  delete(id: string): Promise<void>;
  isInUse(id: string): Promise<boolean>;

  // Query genérica
  getRows(spec?: FindSpec<ApiSection>): Promise<PaginatedResult<ApiSection>>;
  getRow(spec: FindSpec<ApiSection>): Promise<ApiSection | null>;
  getCount(filter?: Filter<ApiSection>): Promise<number>;
  getDistinctValues<K extends keyof ApiSection>(
    field: K,
    filter?: Filter<ApiSection>,
  ): Promise<ApiSection[K][]>;

  /** @deprecated mantener mientras migra `ListApiSectionsUseCase`. */
  findMany(opts: ListApiSectionsOptions): Promise<PaginatedResult<ApiSection>>;

  // Devuelve [section, parent, parent.parent, ..., root]. La pieza clave para
  // la resolución con herencia.
  findAncestorsIncludingSelf(id: string): Promise<ApiSection[]>;
}
