import { DomainError } from '../../../../shared/errors/domain-error';

export class SendingAccountNotFoundError extends DomainError {
  constructor(id: string) {
    super('SENDING_ACCOUNT_NOT_FOUND', `Cuenta de envío ${id} no encontrada.`, {
      id,
    });
  }
}
