import { DomainError } from '../../../../shared/errors/domain-error';

export class PostalCodeAlreadyExistsError extends DomainError {
  constructor(code: string, municipalityId: string) {
    super(
      'POSTAL_CODE_ALREADY_EXISTS',
      `Ya existe el código postal "${code}" en el municipio.`,
      { code, municipalityId },
    );
  }
}
