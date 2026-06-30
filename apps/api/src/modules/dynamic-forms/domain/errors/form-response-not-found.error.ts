import { DomainError } from '../../../../shared/errors/domain-error';

export class FormResponseNotFoundError extends DomainError {
  constructor(id: string) {
    super('FORM_RESPONSE_NOT_FOUND', `Respuesta ${id} no encontrada.`, { id });
  }
}
