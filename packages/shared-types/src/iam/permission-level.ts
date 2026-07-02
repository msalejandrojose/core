import { z } from 'zod';

export const PermissionLevelSchema = z.enum(['NONE', 'READ', 'WRITE', 'DELETE', 'ADMIN']);
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;
export const PERMISSION_LEVELS = PermissionLevelSchema.options;

const ORDER: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  DELETE: 3,
  ADMIN: 4,
};

export const PermissionLevels = {
  satisfies(actual: PermissionLevel, required: PermissionLevel): boolean {
    if (actual === 'NONE') return false;
    if (required === 'NONE') return true;
    return ORDER[actual] >= ORDER[required];
  },
  max(a: PermissionLevel | null, b: PermissionLevel): PermissionLevel {
    if (a === null) return b;
    return ORDER[a] >= ORDER[b] ? a : b;
  },
};
