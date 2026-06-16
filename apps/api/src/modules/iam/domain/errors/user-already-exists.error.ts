import { DomainError } from './domain-error';

export class UserAlreadyExistsError extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';

  constructor(email: string) {
    super(`Ya existe un usuario con el email "${email}".`);
  }
}
