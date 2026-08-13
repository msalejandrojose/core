import { DomainError } from './domain-error';

export class GoogleAuthSessionNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'GOOGLE_AUTH_SESSION_NOT_FOUND',
      `Sesión de login con Google ${id} no encontrada.`,
      { id },
    );
  }
}
