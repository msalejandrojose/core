import { DomainError } from '../../../../shared/errors/domain-error';

export class SectionInUseError extends DomainError {
  constructor(id: string) {
    super('SECTION_IN_USE', `La sección "${id}" tiene subsecciones activas.`, { id });
  }
}
