import { DomainError } from '../../../../shared/errors/domain-error';

export class CarArchetypeCodeAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super(
      'RACING_CAR_ARCHETYPE_CODE_ALREADY_EXISTS',
      `Ya existe un arquetipo con el código "${code}".`,
      { code },
    );
  }
}
