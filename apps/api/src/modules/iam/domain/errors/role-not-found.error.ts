import { DomainError } from './domain-error';

export class RoleNotFoundError extends DomainError {
  readonly code = 'ROLE_NOT_FOUND';

  constructor(identifier: string) {
    super(`Rol "${identifier}" no encontrado.`);
  }
}
