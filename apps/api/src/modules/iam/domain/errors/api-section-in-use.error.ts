import { DomainError } from './domain-error';

export class ApiSectionInUseError extends DomainError {
  constructor(id: string) {
    super(
      'API_SECTION_IN_USE',
      `La sección "${id}" no puede borrarse porque tiene hijos o permisos configurados.`,
      { id },
    );
  }
}
