import { DomainError } from '../../../../shared/errors/domain-error';

export class GrandPrixNotFoundError extends DomainError {
  constructor(id: string) {
    super('RACING_GRAND_PRIX_NOT_FOUND', `Grand Prix ${id} no encontrado.`, {
      id,
    });
  }
}
