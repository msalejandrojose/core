import type { SocialProfile } from '../dto/social-profile';
import type { GameCenterVerificationPayload } from '../../domain/verify-game-center-signature';

export const GAME_CENTER_IDENTITY_VERIFIER = Symbol(
  'IAM_GAME_CENTER_IDENTITY_VERIFIER',
);

export interface GameCenterIdentityVerifierPort {
  /**
   * Verifica la firma de identidad que da `request_identity_verification_signature()`
   * del plugin `gamecenter` en Godot. Lanza `SocialAuthFailedError` si la
   * firma no es válida, el `bundleId` no coincide, o `publicKeyUrl` no es de
   * Apple.
   */
  verify(payload: GameCenterVerificationPayload): Promise<SocialProfile>;
}
