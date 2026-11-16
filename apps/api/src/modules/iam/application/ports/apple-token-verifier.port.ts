import type { SocialProfile } from '../dto/social-profile';

export const APPLE_TOKEN_VERIFIER = Symbol('IAM_APPLE_TOKEN_VERIFIER');

export interface AppleTokenVerifierPort {
  /**
   * Verifica el identity token de Sign in with Apple y devuelve el perfil.
   * Apple no manda el nombre en el token: llega aparte, y solo la primera vez.
   * Lanza `SocialAuthFailedError` si no es válido.
   */
  verify(identityToken: string): Promise<SocialProfile>;
}
