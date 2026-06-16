import { DomainError } from './domain-error';

export class ApiSectionNotFoundError extends DomainError {
  constructor(identifier: string) {
    super('API_SECTION_NOT_FOUND', `Sección "${identifier}" no encontrada.`, { identifier });
  }
}
