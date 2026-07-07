import { DomainError } from '../../../../shared/errors/domain-error';

export class PostalCodeNotFoundError extends DomainError {
  constructor(id: string) {
    super('POSTAL_CODE_NOT_FOUND', `Código postal "${id}" no encontrado.`, {
      id,
    });
  }
}
