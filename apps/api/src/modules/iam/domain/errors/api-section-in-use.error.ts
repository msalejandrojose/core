import { DomainError } from './domain-error';

export class ApiSectionInUseError extends DomainError {
  readonly code = 'API_SECTION_IN_USE';

  constructor(id: string) {
    super(
      `La sección "${id}" no puede borrarse porque tiene hijos o permisos configurados.`,
    );
  }
}
