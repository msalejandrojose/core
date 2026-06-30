import { DomainError } from '../../../../shared/errors/domain-error';

export class SectionNotFoundError extends DomainError {
  constructor(idOrCode: string) {
    super('SECTION_NOT_FOUND', `Sección "${idOrCode}" no encontrada.`, {
      idOrCode,
    });
  }
}
