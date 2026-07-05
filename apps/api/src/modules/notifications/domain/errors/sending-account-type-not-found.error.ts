import { DomainError } from '../../../../shared/errors/domain-error';

export class SendingAccountTypeNotFoundError extends DomainError {
  constructor(idOrKey: string) {
    super(
      'SENDING_ACCOUNT_TYPE_NOT_FOUND',
      `Tipo de cuenta de envío "${idOrKey}" no encontrado.`,
      { idOrKey },
    );
  }
}
