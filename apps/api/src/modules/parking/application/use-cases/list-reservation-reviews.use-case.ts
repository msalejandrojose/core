import { Inject, Injectable } from '@nestjs/common';
import { Review } from '../../domain/entities/review.entity';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';
import {
  REVIEW_REPOSITORY,
  type ReviewRepositoryPort,
} from '../ports/review-repository.port';

/** Las (hasta dos) reseñas de una reserva, visibles para el guest o el host. */
@Injectable()
export class ListReservationReviewsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepositoryPort,
  ) {}

  async execute(reservationId: string, actorUserId: string): Promise<Review[]> {
    const reservation = await this.reservations.findByIdForParticipant(
      reservationId,
      actorUserId,
    );
    if (!reservation) throw new ReservationNotFoundError(reservationId);

    return this.reviews.listForReservation(reservationId);
  }
}
