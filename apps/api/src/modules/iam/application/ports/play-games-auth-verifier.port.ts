import type { SocialProfile } from '../dto/social-profile';

export const PLAY_GAMES_AUTH_VERIFIER = Symbol('IAM_PLAY_GAMES_AUTH_VERIFIER');

export interface PlayGamesAuthVerifierPort {
  /**
   * Canjea el `serverAuthCode` que da `requestServerSideAccess()` del SDK de
   * Play Games Services v2 por un perfil verificado — vía el token endpoint
   * de Google y la API `games/v1/players/me`. Lanza `SocialAuthFailedError`
   * si el canje o la verificación fallan.
   */
  verify(serverAuthCode: string): Promise<SocialProfile>;
}
