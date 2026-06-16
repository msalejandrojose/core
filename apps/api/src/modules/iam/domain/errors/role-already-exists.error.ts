import { DomainError } from './domain-error';

export class RoleAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super('ROLE_ALREADY_EXISTS', `Ya existe un rol con el code "${code}".`, { code });
  }
}
