import { DomainError } from '../../../../shared/errors/domain-error';

export class TagNotFoundError extends DomainError {
  constructor(id: string) {
    super('TAG_NOT_FOUND', `Etiqueta "${id}" no encontrada.`, { id });
  }
}
