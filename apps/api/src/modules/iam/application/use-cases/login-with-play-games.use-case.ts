import { Inject, Injectable } from '@nestjs/common';
import {
  PLAY_GAMES_AUTH_VERIFIER,
  type PlayGamesAuthVerifierPort,
} from '../ports/play-games-auth-verifier.port';
import {
  ResolveSocialUserUseCase,
  type ResolveSocialUserResult,
} from './resolve-social-user.use-case';

@Injectable()
export class LoginWithPlayGamesUseCase {
  constructor(
    @Inject(PLAY_GAMES_AUTH_VERIFIER)
    private readonly verifier: PlayGamesAuthVerifierPort,
    private readonly resolveSocialUser: ResolveSocialUserUseCase,
  ) {}

  async execute(serverAuthCode: string): Promise<ResolveSocialUserResult> {
    const profile = await this.verifier.verify(serverAuthCode);
    return this.resolveSocialUser.execute('play_games', profile);
  }
}
