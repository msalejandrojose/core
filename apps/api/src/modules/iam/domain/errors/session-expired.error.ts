import { DomainError } from '../../../../shared/errors/domain-error';

/** El refresh token no vale (caducado, revocado o desconocido): hay que entrar otra vez. */
export class SessionExpiredError extends DomainError {
  constructor() {
    super('SESSION_EXPIRED', 'La sesión ha caducado. Vuelve a iniciar sesión.');
  }
}
