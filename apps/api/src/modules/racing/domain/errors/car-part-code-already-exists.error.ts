import { DomainError } from '../../../../shared/errors/domain-error';

export class CarPartCodeAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super(
      'RACING_CAR_PART_CODE_ALREADY_EXISTS',
      `Ya existe una pieza con el código "${code}".`,
      { code },
    );
  }
}
