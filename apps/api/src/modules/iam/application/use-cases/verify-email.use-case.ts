import { Inject, Injectable } from '@nestjs/common';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';
import { USER_REPOSITORY, type UserRepositoryPort } from '../ports/user-repository.port';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(token: string): Promise<void> {
    const user = await this.users.findByEmailVerificationToken(token);

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new InvalidTokenError();
    }

    await this.users.updateTokens(user.id, {
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      isActive: true,
    });
  }
}
