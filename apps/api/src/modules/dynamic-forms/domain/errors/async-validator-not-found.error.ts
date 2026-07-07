import { DomainError } from '../../../../shared/errors/domain-error';

/** No hay validador async registrado para el `ref` pedido. */
export class AsyncValidatorNotFoundError extends DomainError {
  constructor(ref: string) {
    super(
      'ASYNC_VALIDATOR_NOT_FOUND',
      `No existe un validador asíncrono para "${ref}".`,
      { ref },
    );
  }
}
