import { DomainError } from '../../../../shared/errors/domain-error';

export class MessageTypeNotFoundError extends DomainError {
  constructor(idOrKey: string) {
    super(
      'MESSAGE_TYPE_NOT_FOUND',
      `Tipo de mensaje "${idOrKey}" no encontrado.`,
      {
        idOrKey,
      },
    );
  }
}
