import { DomainError } from '../../../../shared/errors/domain-error';

export class SeasonNotFoundError extends DomainError {
  constructor(id: string) {
    super('RACING_SEASON_NOT_FOUND', `Temporada ${id} no encontrada.`, {
      id,
    });
  }
}
