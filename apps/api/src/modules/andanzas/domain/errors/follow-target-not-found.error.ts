import { DomainError } from '../../../../shared/errors/domain-error';

export class FollowTargetNotFoundError extends DomainError {
  constructor(userId: string) {
    super('ANDANZAS_FOLLOW_TARGET_NOT_FOUND', `Usuario "${userId}" no encontrado.`, {
      userId,
    });
  }
}
