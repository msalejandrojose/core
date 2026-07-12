import { DomainError } from '../../../../shared/errors/domain-error';

export class CannotFollowSelfError extends DomainError {
  constructor(userId: string) {
    super('ANDANZAS_CANNOT_FOLLOW_SELF', 'No puedes seguirte a ti mismo.', {
      userId,
    });
  }
}
