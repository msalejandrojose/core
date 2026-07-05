import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidMessageContentError extends DomainError {
  constructor(reason: string) {
    super(
      'INVALID_MESSAGE_CONTENT',
      `Contenido del mensaje inválido: ${reason}.`,
      { reason },
    );
  }
}
