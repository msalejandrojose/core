import { DomainError } from './domain-error';

export class InvalidTokenError extends DomainError {
  constructor() {
    super('INVALID_TOKEN', 'El token es inválido o ha expirado.');
  }
}
