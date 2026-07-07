import { DomainError } from '../../../../shared/errors/domain-error';

export class MunicipalityAlreadyExistsError extends DomainError {
  constructor(code: string, provinceId: string) {
    super(
      'MUNICIPALITY_ALREADY_EXISTS',
      `Ya existe un municipio con el código "${code}" en la provincia.`,
      { code, provinceId },
    );
  }
}
