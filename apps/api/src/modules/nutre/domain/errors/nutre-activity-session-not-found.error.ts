import { DomainError } from '../../../../shared/errors/domain-error';

export class NutreActivitySessionNotFoundError extends DomainError {
  constructor(id: string) {
    super('NUTRE_ACTIVITY_SESSION_NOT_FOUND', `Sesión de actividad ${id} no encontrada.`, {
      id,
    });
  }
}
