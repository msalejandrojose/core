import { DomainError } from '../../../../shared/errors/domain-error';

export class LeadTagNotFoundError extends DomainError {
  constructor(id: string) {
    super('LEAD_TAG_NOT_FOUND', `Etiqueta de lead ${id} no encontrada.`, {
      id,
    });
  }
}
