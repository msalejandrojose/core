import type { UserModel } from '../../../../generated/prisma/models';
import { User, type UserType } from '../../domain/entities/user.entity';

// Mapea entre la entidad de dominio (`User`) y el modelo Prisma (`UserModel`).
// Esta clase es el ÚNICO sitio donde el dominio "toca" Prisma (indirectamente).
// Si el schema cambia, este mapper es lo único que se actualiza fuera del
// módulo de persistence.
export class UserMapper {
  static toDomain(row: UserModel): User {
    return new User(
      row.id,
      row.email,
      row.passwordHash,
      row.firstName,
      row.lastName,
      row.userType as UserType,
      row.isActive,
      row.lastLoginAt,
      row.createdAt,
      row.updatedAt,
      row.emailVerificationToken ?? null,
      row.emailVerificationExpiresAt ?? null,
      row.passwordResetToken ?? null,
      row.passwordResetExpiresAt ?? null,
    );
  }

  static toPersistenceCreate(user: User) {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      emailVerificationToken: user.emailVerificationToken,
      emailVerificationExpiresAt: user.emailVerificationExpiresAt,
      passwordResetToken: user.passwordResetToken,
      passwordResetExpiresAt: user.passwordResetExpiresAt,
      // createdAt / updatedAt los gestiona Prisma (@default / @updatedAt).
    };
  }
}
