import { DomainError } from '../../../../shared/errors/domain-error';

export class ReservationNotFoundError extends DomainError {
  constructor(id: string) {
    super('RESERVATION_NOT_FOUND', `Reserva ${id} no encontrada.`, { id });
  }
}
