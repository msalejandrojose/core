import type { UserType } from '@core/shared-types';

export type { UserType };

// Entidad de dominio pura. No depende de Prisma ni de Nest. Si necesitas
// crear un User desde una fila de BBDD, usa el `UserMapper` en
// `infrastructure/persistence/`.
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string | null,
    public readonly firstName: string | null,
    public readonly lastName: string | null,
    public readonly userType: UserType,
    public readonly isActive: boolean,
    public readonly lastLoginAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Email verification
    public readonly emailVerificationToken: string | null = null,
    public readonly emailVerificationExpiresAt: Date | null = null,
    // Password reset
    public readonly passwordResetToken: string | null = null,
    public readonly passwordResetExpiresAt: Date | null = null,
  ) {}

  isDeactivated(): boolean {
    return !this.isActive;
  }
}
