import { Inject, Injectable } from '@nestjs/common';
import {
  FACEBOOK_TOKEN_VERIFIER,
  type FacebookTokenVerifierPort,
} from '../ports/facebook-token-verifier.port';
import {
  ResolveSocialUserUseCase,
  type ResolveSocialUserResult,
} from './resolve-social-user.use-case';

@Injectable()
export class LoginWithFacebookUseCase {
  constructor(
    @Inject(FACEBOOK_TOKEN_VERIFIER)
    private readonly verifier: FacebookTokenVerifierPort,
    private readonly resolveSocialUser: ResolveSocialUserUseCase,
  ) {}

  async execute(accessToken: string): Promise<ResolveSocialUserResult> {
    const profile = await this.verifier.verify(accessToken);
    return this.resolveSocialUser.execute('facebook', profile);
  }
}
