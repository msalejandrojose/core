import type { SocialProfile } from '../dto/social-profile';

export const FACEBOOK_TOKEN_VERIFIER = Symbol('IAM_FACEBOOK_TOKEN_VERIFIER');

export interface FacebookTokenVerifierPort {
  /** Verifica un access token de Facebook y devuelve el perfil. Lanza `SocialAuthFailedError` si no es válido. */
  verify(accessToken: string): Promise<SocialProfile>;
}
