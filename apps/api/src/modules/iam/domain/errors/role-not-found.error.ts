import { DomainError } from './domain-error';

export class RoleNotFoundError extends DomainError {
  constructor(identifier: string) {
    super('ROLE_NOT_FOUND', `Rol "${identifier}" no encontrado.`, { identifier });
  }
}
