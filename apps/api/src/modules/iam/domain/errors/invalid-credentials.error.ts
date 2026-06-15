import { DomainError } from './domain-error';

// Usamos un único error genérico para "email no existe", "password incorrecta"
// y "usuario inactivo". No filtra al atacante qué de las tres falló.
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Credenciales inválidas.');
  }
}
