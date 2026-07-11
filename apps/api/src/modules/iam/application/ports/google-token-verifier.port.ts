import type { SocialProfile } from '../dto/social-profile';

export const GOOGLE_TOKEN_VERIFIER = Symbol('IAM_GOOGLE_TOKEN_VERIFIER');

export interface GoogleTokenVerifierPort {
  /** Verifica un Google ID token y devuelve el perfil. Lanza `SocialAuthFailedError` si no es válido. */
  verify(idToken: string): Promise<SocialProfile>;
}
