import { Inject, Injectable } from '@nestjs/common';
import {
  GOOGLE_TOKEN_VERIFIER,
  type GoogleTokenVerifierPort,
} from '../ports/google-token-verifier.port';
import {
  ResolveSocialUserUseCase,
  type ResolveSocialUserResult,
} from './resolve-social-user.use-case';

@Injectable()
export class LoginWithGoogleUseCase {
  constructor(
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly verifier: GoogleTokenVerifierPort,
    private readonly resolveSocialUser: ResolveSocialUserUseCase,
  ) {}

  async execute(idToken: string): Promise<ResolveSocialUserResult> {
    const profile = await this.verifier.verify(idToken);
    return this.resolveSocialUser.execute('google', profile);
  }
}
