import { DomainError } from './domain-error';

export class ApiSectionAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super('API_SECTION_ALREADY_EXISTS', `Ya existe una sección con el code "${code}".`, { code });
  }
}
