import { DomainError } from '../../../../shared/errors/domain-error';

// Se lanza al operar (marcar leída) sobre una notificación que no existe o que
// no pertenece al usuario autenticado. En ambos casos devolvemos 404 para no
// filtrar la existencia de notificaciones de otros usuarios.
export class NotificationNotFoundError extends DomainError {
  constructor(id: string) {
    super('NOTIFICATION_NOT_FOUND', `Notificación ${id} no encontrada.`, {
      id,
    });
  }
}
