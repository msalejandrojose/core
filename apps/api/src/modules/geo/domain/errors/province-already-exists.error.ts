import { DomainError } from '../../../../shared/errors/domain-error';

export class ProvinceAlreadyExistsError extends DomainError {
  constructor(code: string, countryId: string) {
    super(
      'PROVINCE_ALREADY_EXISTS',
      `Ya existe una provincia con el código "${code}" en el país.`,
      { code, countryId },
    );
  }
}
