import { DomainError } from './domain-error';

export class ApiSectionAlreadyExistsError extends DomainError {
  readonly code = 'API_SECTION_ALREADY_EXISTS';

  constructor(code: string) {
    super(`Ya existe una sección con el code "${code}".`);
  }
}
