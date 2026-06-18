import { DomainError } from '../../../../shared/errors/domain-error';

export class ActionHandlerNotFoundError extends DomainError {
  constructor(key: string) {
    super(
      'ACTION_HANDLER_NOT_FOUND',
      `No hay handler registrado para la acción "${key}".`,
      { key },
    );
  }
}
