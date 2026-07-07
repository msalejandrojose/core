import { DomainError } from '../../../../shared/errors/domain-error';

export class CountryAlreadyExistsError extends DomainError {
  constructor(iso: string) {
    super(
      'COUNTRY_ALREADY_EXISTS',
      `Ya existe un país con el código ISO "${iso}".`,
      { iso },
    );
  }
}
