import { Inject, Injectable } from '@nestjs/common';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port';
import { USER_REPOSITORY, type UserRepositoryPort } from '../ports/user-repository.port';

export interface ResetPasswordInput {
  token: string;
  password: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const user = await this.users.findByPasswordResetToken(input.token);

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new InvalidTokenError();
    }

    const passwordHash = await this.hasher.hash(input.password);

    await this.users.updateTokens(user.id, {
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      passwordHash,
    });
  }
}
