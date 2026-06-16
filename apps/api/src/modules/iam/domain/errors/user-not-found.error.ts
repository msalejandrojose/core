import { DomainError } from '../../../../shared/errors/domain-error';

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super('USER_NOT_FOUND', `Usuario ${userId} no encontrado.`, { userId });
  }
}
