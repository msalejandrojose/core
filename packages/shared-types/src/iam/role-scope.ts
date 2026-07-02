import { z } from 'zod';

export const RoleScopeSchema = z.enum(['BACKOFFICE', 'APP', 'SHARED']);
export type RoleScope = z.infer<typeof RoleScopeSchema>;
export const ROLE_SCOPES = RoleScopeSchema.options;
