import { DomainError } from './domain-error';

export class ApiSectionNotFoundError extends DomainError {
  readonly code = 'API_SECTION_NOT_FOUND';

  constructor(identifier: string) {
    super(`Sección "${identifier}" no encontrada.`);
  }
}
