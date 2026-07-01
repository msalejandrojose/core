import { DomainError } from '../../../../shared/errors/domain-error';

export class SectionAlreadyExistsError extends DomainError {
  constructor(code: string, scope: string) {
    super('SECTION_ALREADY_EXISTS', `Ya existe una sección con código "${code}" en scope ${scope}.`, {
      code,
      scope,
    });
  }
}
