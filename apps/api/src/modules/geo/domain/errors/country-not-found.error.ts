import { DomainError } from '../../../../shared/errors/domain-error';

export class CountryNotFoundError extends DomainError {
  constructor(id: string) {
    super('COUNTRY_NOT_FOUND', `País "${id}" no encontrado.`, { id });
  }
}
