import { DomainError } from '../../../../shared/errors/domain-error';

export class ReviewAlreadyExistsError extends DomainError {
  constructor(reservationId: string) {
    super(
      'REVIEW_ALREADY_EXISTS',
      'Ya has dejado una reseña para esta reserva.',
      { reservationId },
    );
  }
}
