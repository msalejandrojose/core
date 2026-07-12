import { DomainError } from '../../../../shared/errors/domain-error';

export class TooManyActiveInvitationsError extends DomainError {
  constructor(userId: string, max: number) {
    super(
      'ANDANZAS_TOO_MANY_ACTIVE_INVITATIONS',
      `Ya tienes ${max} invitaciones activas, el máximo permitido.`,
      { userId, max },
    );
  }
}
