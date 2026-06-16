import { DomainError } from './domain-error';

// Usamos un único error genérico para "email no existe", "password incorrecta"
// y "usuario inactivo". No filtra al atacante qué de las tres falló.
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Credenciales inválidas.');
  }
}
