import { DomainError } from '../../../../shared/errors/domain-error';

/** La reserva está cancelada, o ya tiene un pago `PAID`/`PENDING` en curso. */
export class ReservationNotPayableError extends DomainError {
  constructor(reservationId: string) {
    super(
      'RESERVATION_NOT_PAYABLE',
      'La reserva no admite un nuevo cobro (cancelada o ya tiene un pago en curso).',
      { reservationId },
    );
  }
}
