import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_CENTER_IDENTITY_VERIFIER,
  type GameCenterIdentityVerifierPort,
} from '../ports/game-center-identity-verifier.port';
import type { GameCenterVerificationPayload } from '../../domain/verify-game-center-signature';
import {
  ResolveSocialUserUseCase,
  type ResolveSocialUserResult,
} from './resolve-social-user.use-case';

@Injectable()
export class LoginWithGameCenterUseCase {
  constructor(
    @Inject(GAME_CENTER_IDENTITY_VERIFIER)
    private readonly verifier: GameCenterIdentityVerifierPort,
    private readonly resolveSocialUser: ResolveSocialUserUseCase,
  ) {}

  async execute(
    payload: GameCenterVerificationPayload,
  ): Promise<ResolveSocialUserResult> {
    const profile = await this.verifier.verify(payload);
    return this.resolveSocialUser.execute('game_center', profile);
  }
}
