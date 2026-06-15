import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../ports/token-issuer.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: User;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email);

    // Único error para los tres casos (usuario inexistente, password mal,
    // usuario inactivo). No le decimos al atacante cuál falló.
    if (!user || !user.passwordHash || user.isDeactivated()) {
      throw new InvalidCredentialsError();
    }

    const ok = await this.hasher.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      userType: user.userType,
    });

    return { accessToken, user };
  }
}
