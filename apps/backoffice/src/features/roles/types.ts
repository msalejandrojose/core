import type { RoleScope, PermissionLevel } from '@core/shared-types';
import { ROLE_SCOPES, PERMISSION_LEVELS } from '@core/shared-types';

export type { RoleScope, PermissionLevel };
export { ROLE_SCOPES, PERMISSION_LEVELS };

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  scope: RoleScope;
  description: string | null;
  createdAt: string;
}
