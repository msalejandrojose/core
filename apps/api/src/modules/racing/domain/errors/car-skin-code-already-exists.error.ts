import { DomainError } from '../../../../shared/errors/domain-error';

export class CarSkinCodeAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super(
      'RACING_CAR_SKIN_CODE_ALREADY_EXISTS',
      `Ya existe un skin con el código "${code}".`,
      { code },
    );
  }
}
