import { DomainError } from './domain-error';

export class RoleAlreadyExistsError extends DomainError {
  readonly code = 'ROLE_ALREADY_EXISTS';

  constructor(code: string) {
    super(`Ya existe un rol con el code "${code}".`);
  }
}
