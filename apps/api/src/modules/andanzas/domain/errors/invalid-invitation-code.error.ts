import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidInvitationCodeError extends DomainError {
  constructor(code: string) {
    super(
      'ANDANZAS_INVITATION_INVALID',
      `El código de invitación "${code}" no es válido o ha caducado.`,
      { code },
    );
  }
}
