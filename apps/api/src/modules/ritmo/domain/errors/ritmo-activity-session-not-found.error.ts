import { DomainError } from '../../../../shared/errors/domain-error';

export class RitmoActivitySessionNotFoundError extends DomainError {
  constructor(id: string) {
    super('RITMO_ACTIVITY_SESSION_NOT_FOUND', `Sesión de actividad ${id} no encontrada.`, {
      id,
    });
  }
}
