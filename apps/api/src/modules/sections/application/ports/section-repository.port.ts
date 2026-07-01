import {
  RoleSectionAccessRecord,
  Section,
  SectionScope,
  UserSectionAccessRecord,
} from '../../domain/entities/section.entity';

export const SECTION_REPOSITORY = Symbol('SECTIONS_SECTION_REPOSITORY');

export interface ListSectionsOptions {
  page: number;
  limit: number;
  sort?: string;
  order: 'asc' | 'desc';
  scope?: SectionScope;
  isActive?: boolean;
  codeContains?: string;
  nameContains?: string;
}

export interface UpdateSectionPatch {
  code?: string;
  name?: string;
  icon?: string | null;
  route?: string | null;
  parentId?: string | null;
  scope?: SectionScope;
  order?: number;
  isActive?: boolean;
  apiRequirements?: string[];
}

export interface SectionRepositoryPort {
  /** Devuelve todas las secciones activas de un scope (incluyendo SHARED). */
  findAllActiveByScope(scope: SectionScope): Promise<Section[]>;

  /** Devuelve todas las secciones (sin filtro de isActive ni scope). */
  findAll(): Promise<Section[]>;

  /** Busca una sección por id. */
  findById(id: string): Promise<Section | null>;

  /** Busca una sección por (code, scope). */
  findByCodeAndScope(code: string, scope: SectionScope): Promise<Section | null>;

  /** True si la sección tiene hijos activos directos. */
  hasActiveChildren(id: string): Promise<boolean>;

  /** Listado paginado para panel de admin (sin filtro de permisos). */
  list(opts: ListSectionsOptions): Promise<{ items: Section[]; total: number }>;

  /** Persiste una sección nueva. */
  create(section: Section): Promise<Section>;

  /** Aplica un patch parcial sobre una sección existente. */
  update(id: string, patch: UpdateSectionPatch): Promise<Section>;

  /** Soft delete: isActive = false. */
  softDelete(id: string): Promise<void>;

  /** Lista grants/denies de los roles dados sobre cualquier sección. */
  findRoleAccess(userRoleIds: string[]): Promise<RoleSectionAccessRecord[]>;

  /** Lista grants/denies del usuario sobre cualquier sección. */
  findUserAccess(userId: string): Promise<UserSectionAccessRecord[]>;
}
