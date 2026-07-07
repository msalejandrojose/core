import { DomainError } from '../../../../shared/errors/domain-error';

export class RegionAlreadyExistsError extends DomainError {
  constructor(code: string, countryId: string) {
    super(
      'REGION_ALREADY_EXISTS',
      `Ya existe una comunidad autónoma con el código "${code}" en el país.`,
      { code, countryId },
    );
  }
}
