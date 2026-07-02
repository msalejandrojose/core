import type { RoleScope, UserType } from '@core/shared-types';

export type { RoleScope };

// `Role` puro. Sin dependencias de Prisma. La mapping vive en
// `infrastructure/persistence/role.mapper.ts`.
export class Role {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly scope: RoleScope,
    // Self-FK opcional para herencia entre roles.
    public readonly parentRoleId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  // Determina si este rol puede asignarse a un usuario de tipo `userType`.
  appliesTo(userType: UserType): boolean {
    if (this.scope === 'SHARED') return true;
    return this.scope === userType;
  }
}
