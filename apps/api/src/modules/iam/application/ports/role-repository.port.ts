import type { Filter, FindSpec } from '../../../../shared/query';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Role, type RoleScope } from '../../domain/entities/role.entity';

export const ROLE_REPOSITORY = Symbol('IAM_ROLE_REPOSITORY');

/** @deprecated Usar `getRows({ filter, order, limit })`. */
export interface ListRolesOptions {
  page: number;
  limit: number;
  sort?: string;
  order: 'asc' | 'desc';
  scope?: RoleScope;
  codeContains?: string;
}

export interface UpdateRolePatch {
  name?: string;
  description?: string | null;
  scope?: RoleScope;
  parentRoleId?: string | null;
}

export interface RoleRepositoryPort {
  findById(id: string): Promise<Role | null>;
  findByCode(code: string): Promise<Role | null>;
  create(role: Role): Promise<Role>;
  update(id: string, patch: UpdateRolePatch): Promise<Role>;
  delete(id: string): Promise<void>;
  isInUse(id: string): Promise<boolean>;

  // Query genérica
  getRows(spec?: FindSpec<Role>): Promise<PaginatedResult<Role>>;
  getRow(spec: FindSpec<Role>): Promise<Role | null>;
  getCount(filter?: Filter<Role>): Promise<number>;
  getDistinctValues<K extends keyof Role>(
    field: K,
    filter?: Filter<Role>,
  ): Promise<Role[K][]>;

  /** @deprecated mantener mientras migra `ListRolesUseCase`. */
  findMany(opts: ListRolesOptions): Promise<PaginatedResult<Role>>;

  // Asignaciones a usuarios (pivot user_user_role).
  assignToUser(
    userId: string,
    roleId: string,
    assignedByUserId: string | null,
  ): Promise<void>;
  unassignFromUser(userId: string, roleId: string): Promise<void>;
  isAssignedToUser(userId: string, roleId: string): Promise<boolean>;
  findRolesByUserId(userId: string): Promise<Role[]>;

  // Devuelve [role, parent, parent.parent, ..., root]. Para el resolver de
  // permisos con herencia entre roles.
  findAncestorsIncludingSelf(roleId: string): Promise<Role[]>;
}
