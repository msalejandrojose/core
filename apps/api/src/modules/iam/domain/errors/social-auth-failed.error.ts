import { DomainError } from './domain-error';

// El token/código del proveedor (Google/Facebook) no es válido, ha expirado,
// o no pertenece a esta app (aud/appId no coincide).
export class SocialAuthFailedError extends DomainError {
  constructor(provider: 'google' | 'facebook') {
    super(
      'SOCIAL_AUTH_FAILED',
      `No se pudo verificar el inicio de sesión con ${provider === 'google' ? 'Google' : 'Facebook'}.`,
    );
  }
}
