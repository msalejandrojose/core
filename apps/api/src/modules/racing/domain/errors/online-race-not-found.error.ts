import { DomainError } from '../../../../shared/errors/domain-error';

export class OnlineRaceNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'RACING_ONLINE_RACE_NOT_FOUND',
      `Carrera online ${id} no encontrada.`,
      {
        id,
      },
    );
  }
}
