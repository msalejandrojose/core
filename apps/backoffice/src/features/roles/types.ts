export type RoleScope = 'BACKOFFICE' | 'APP' | 'SHARED';

export type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';

export const ROLE_SCOPES: RoleScope[] = ['BACKOFFICE', 'APP', 'SHARED'];

export const PERMISSION_LEVELS: PermissionLevel[] = [
  'NONE',
  'READ',
  'WRITE',
  'DELETE',
  'ADMIN',
];

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  scope: RoleScope;
  description: string | null;
  createdAt: string;
}
