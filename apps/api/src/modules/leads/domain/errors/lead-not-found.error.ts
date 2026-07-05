import { DomainError } from '../../../../shared/errors/domain-error';

export class LeadNotFoundError extends DomainError {
  constructor(id: string) {
    super('LEAD_NOT_FOUND', `Lead ${id} no encontrado.`, { id });
  }
}
