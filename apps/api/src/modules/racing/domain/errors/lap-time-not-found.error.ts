import { DomainError } from '../../../../shared/errors/domain-error';

export class LapTimeNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'RACING_LAP_TIME_NOT_FOUND',
      `Tiempo de vuelta ${id} no encontrado.`,
      { id },
    );
  }
}
