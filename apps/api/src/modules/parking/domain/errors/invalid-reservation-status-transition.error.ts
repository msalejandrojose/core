import type { ReservationStatus } from '@core/shared-types';
import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidReservationStatusTransitionError extends DomainError {
  constructor(from: ReservationStatus, to: ReservationStatus) {
    super(
      'INVALID_RESERVATION_TRANSITION',
      `La transición de estado de la reserva de ${from} a ${to} no está permitida.`,
      { from, to },
    );
  }
}
