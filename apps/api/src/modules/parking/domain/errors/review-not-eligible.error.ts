import { DomainError } from '../../../../shared/errors/domain-error';

/** La reserva no es del usuario, o no está `CONFIRMED` con la estancia ya terminada. */
export class ReviewNotEligibleError extends DomainError {
  constructor(reservationId: string) {
    super(
      'REVIEW_NOT_ELIGIBLE',
      'La reserva no admite reseña todavía (debe estar confirmada y la estancia ya haber terminado).',
      { reservationId },
    );
  }
}
