import { DomainError } from '../../../../shared/errors/domain-error';

export class BrioActivitySessionNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'BRIO_ACTIVITY_SESSION_NOT_FOUND',
      `Sesión de actividad ${id} no encontrada.`,
      {
        id,
      },
    );
  }
}
