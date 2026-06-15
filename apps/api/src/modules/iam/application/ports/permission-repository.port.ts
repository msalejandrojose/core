import { type PermissionLevel } from '../../domain/entities/permission-level';

export const PERMISSION_REPOSITORY = Symbol('IAM_PERMISSION_REPOSITORY');

export interface RolePermissionEntry {
  userRoleId: string;
  apiSectionId: string;
  permissionLevel: PermissionLevel;
}

export interface UserPermissionEntry {
  userId: string;
  apiSectionId: string;
  permissionLevel: PermissionLevel;
}

export interface PermissionRepositoryPort {
  // ---- Role permissions ----
  upsertRolePermission(
    roleId: string,
    sectionId: string,
    level: PermissionLevel,
  ): Promise<void>;
  deleteRolePermission(roleId: string, sectionId: string): Promise<void>;
  listRolePermissions(roleId: string): Promise<RolePermissionEntry[]>;
  // Para el resolver: trae las permissions de un set de roles para un set de
  // secciones en una sola query.
  findRolePermissionsForRoles(
    roleIds: string[],
    sectionIds: string[],
  ): Promise<RolePermissionEntry[]>;

  // ---- User overrides ----
  upsertUserPermission(
    userId: string,
    sectionId: string,
    level: PermissionLevel,
  ): Promise<void>;
  deleteUserPermission(userId: string, sectionId: string): Promise<void>;
  listUserPermissions(userId: string): Promise<UserPermissionEntry[]>;
  findUserPermissionsForUser(
    userId: string,
    sectionIds: string[],
  ): Promise<UserPermissionEntry[]>;
}
