import { DomainError } from '../../../../shared/errors/domain-error';

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(
      'USER_ALREADY_EXISTS',
      `Ya existe un usuario con el email ${email}.`,
      { email },
    );
  }
}
