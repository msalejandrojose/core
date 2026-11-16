import { Inject, Injectable } from '@nestjs/common';
import {
  APPLE_TOKEN_VERIFIER,
  type AppleTokenVerifierPort,
} from '../ports/apple-token-verifier.port';
import {
  ResolveSocialUserUseCase,
  type ResolveSocialUserResult,
} from './resolve-social-user.use-case';

const clean = (s: string | null | undefined) => s?.trim().slice(0, 100) || null;

@Injectable()
export class LoginWithAppleUseCase {
  constructor(
    @Inject(APPLE_TOKEN_VERIFIER)
    private readonly verifier: AppleTokenVerifierPort,
    private readonly resolveSocialUser: ResolveSocialUserUseCase,
  ) {}

  /**
   * El nombre no va en el token: Apple se lo da a la app solo la primera vez
   * que el usuario autoriza, y la app lo manda aparte para crear la cuenta.
   */
  async execute(
    identityToken: string,
    name: { firstName?: string | null; lastName?: string | null } = {},
  ): Promise<ResolveSocialUserResult> {
    const profile = await this.verifier.verify(identityToken);
    return this.resolveSocialUser.execute('apple', {
      ...profile,
      firstName: clean(name.firstName) ?? profile.firstName,
      lastName: clean(name.lastName) ?? profile.lastName,
    });
  }
}
