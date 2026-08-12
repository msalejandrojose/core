import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';
import type { SocialProfile } from '../dto/social-profile';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../ports/token-issuer.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

export type SocialProvider = 'google' | 'facebook';

export interface ResolveSocialUserResult {
  accessToken: string;
  user: User;
}

// Lógica compartida por `LoginWithGoogleUseCase` y `LoginWithFacebookUseCase`
// una vez el token ya fue verificado por el proveedor correspondiente:
// 1. Busca un usuario ya vinculado a ese proveedor → login directo.
// 2. Si no, busca por email → vincula el proveedor a la cuenta existente
//    (permite entrar con password Y con social sobre la misma cuenta).
// 3. Si no existe ninguno, crea un usuario nuevo (tipo APP, sin password,
//    activo — el proveedor ya verificó su identidad).
@Injectable()
export class ResolveSocialUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
  ) {}

  async execute(
    provider: SocialProvider,
    profile: SocialProfile,
  ): Promise<ResolveSocialUserResult> {
    let user = await this.findByProvider(provider, profile.providerId);

    if (!user && profile.email) {
      const byEmail = await this.users.findByEmail(profile.email);
      if (byEmail) {
        user = await this.users.linkSocialAccount(byEmail.id, {
          [provider === 'google' ? 'googleId' : 'facebookId']:
            profile.providerId,
          avatarUrl: profile.avatarUrl ?? byEmail.avatarUrl,
          firstName: byEmail.firstName ?? profile.firstName,
          lastName: byEmail.lastName ?? profile.lastName,
        });
      }
    }

    if (!user) {
      // Sin email no podemos crear una cuenta consistente con el resto del
      // sistema (el email es el identificador único de login).
      if (!profile.email) {
        throw new SocialAuthFailedError(provider);
      }
      user = await this.users.create(
        new User(
          randomUUID(),
          profile.email,
          null, // sin password: cuenta 100% social
          profile.firstName,
          profile.lastName,
          'APP', // el login social solo lo usa la app móvil
          true, // activo: el proveedor ya verificó la identidad
          null,
          new Date(),
          new Date(),
          null,
          null,
          null,
          null,
          provider === 'google' ? profile.providerId : null,
          provider === 'facebook' ? profile.providerId : null,
          profile.avatarUrl,
        ),
      );
    }

    if (user.isDeactivated()) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      userType: user.userType,
    });

    return { accessToken, user };
  }

  private findByProvider(
    provider: SocialProvider,
    providerId: string,
  ): Promise<User | null> {
    return provider === 'google'
      ? this.users.findByGoogleId(providerId)
      : this.users.findByFacebookId(providerId);
  }
}
