import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Cambio de contraseña del propio usuario autenticado. Verifica la contraseña
 * actual antes de aplicar la nueva (mismo `InvalidCredentialsError` si no
 * coincide, sin filtrar detalle).
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }
    if (!user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const ok = await this.hasher.verify(
      user.passwordHash,
      input.currentPassword,
    );
    if (!ok) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.updateTokens(user.id, { passwordHash });
  }
}
