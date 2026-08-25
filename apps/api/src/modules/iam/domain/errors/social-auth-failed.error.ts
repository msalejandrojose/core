import { DomainError } from './domain-error';

const PROVIDER_LABEL = {
  google: 'Google',
  facebook: 'Facebook',
  play_games: 'Google Play Games',
  game_center: 'Game Center',
} as const;

// El token/código/firma del proveedor no es válido, ha expirado, o no
// pertenece a esta app (aud/appId/bundleId no coincide).
export class SocialAuthFailedError extends DomainError {
  constructor(provider: keyof typeof PROVIDER_LABEL) {
    super(
      'SOCIAL_AUTH_FAILED',
      `No se pudo verificar el inicio de sesión con ${PROVIDER_LABEL[provider]}.`,
    );
  }
}
